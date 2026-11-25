/**
 * MOD-005 · Identidad — Reglas de negocio del registro de cuentas.
 *
 * Cuando llega aquí, los datos ya pasaron la validación de FORMA con Zod
 * (validate.middleware). Esta capa aplica las reglas que dependen de la BD:
 *   1. Correo y matrícula no deben existir → 409 CONFLICT.
 *   2. La contraseña se guarda como hash BCrypt (costo BCRYPT_COST >= 10).
 *   3. Se devuelve el usuario público (UsuarioDTO), jamás el hash.
 */
import bcrypt from 'bcryptjs';
import { env } from '../../config/env';
import type { RegistroRequest, UsuarioDTO } from '../../schemas/api.contracts';
import { AppError } from '../../types/http.types';
import { buscarDuplicados, insertarUsuario, type Duplicados } from './identidad.repository';

const MENSAJE_CORREO_DUPLICADO = 'Este correo ya está registrado';
const MENSAJE_MATRICULA_DUPLICADA = 'Esta matrícula ya está registrada';

/** 409 con el detalle por campo, en el mismo formato que los errores de Zod. */
const errorDuplicado = (dup: Duplicados): AppError => {
  const campos = [
    ...(dup.correo
      ? [{ ruta: 'body.correo', mensaje: MENSAJE_CORREO_DUPLICADO, codigo: 'duplicado' }]
      : []),
    ...(dup.matricula
      ? [{ ruta: 'body.matricula', mensaje: MENSAJE_MATRICULA_DUPLICADA, codigo: 'duplicado' }]
      : []),
  ];
  const message =
    dup.correo && dup.matricula
      ? 'El correo y la matrícula ya están registrados'
      : dup.correo
        ? MENSAJE_CORREO_DUPLICADO
        : MENSAJE_MATRICULA_DUPLICADA;
  return AppError.conflict(message, 'CONFLICT', { campos });
};

/**
 * Si dos registros iguales llegan al mismo tiempo, ambos pueden pasar la
 * verificación previa; el UNIQUE de MySQL rechaza al segundo con ER_DUP_ENTRY.
 * Aquí lo traducimos al mismo 409 detallado usando el nombre de la llave.
 */
const duplicadoDesdeMysql = (err: unknown): Duplicados | null => {
  if (typeof err !== 'object' || err === null) return null;
  const { code, sqlMessage } = err as { code?: unknown; sqlMessage?: unknown };
  if (code !== 'ER_DUP_ENTRY' || typeof sqlMessage !== 'string') return null;
  return {
    correo: sqlMessage.includes('UK_usuario_correo'),
    matricula: sqlMessage.includes('UK_usuario_matricula'),
  };
};

export const registrarAlumno = async (datos: RegistroRequest): Promise<UsuarioDTO> => {
  const dup = await buscarDuplicados(datos.correo, datos.matricula);
  if (dup.correo || dup.matricula) throw errorDuplicado(dup);

  const contrasena_hash = await bcrypt.hash(datos.contrasena, env.BCRYPT_COST);

  let id_usuario: number;
  try {
    id_usuario = await insertarUsuario({
      matricula: datos.matricula,
      nombre: datos.nombre,
      correo: datos.correo,
      contrasena_hash,
      rol: datos.rol,
    });
  } catch (err) {
    const dupCarrera = duplicadoDesdeMysql(err);
    if (dupCarrera && (dupCarrera.correo || dupCarrera.matricula)) throw errorDuplicado(dupCarrera);
    throw err; // Cualquier otro error lo maneja error.middleware
  }

  return {
    id_usuario,
    matricula: datos.matricula,
    nombre: datos.nombre,
    correo: datos.correo,
    rol: datos.rol,
    activo: true,
  };
};
