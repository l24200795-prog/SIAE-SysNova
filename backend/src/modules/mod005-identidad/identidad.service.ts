/**
 * MOD-005 · Identidad — Reglas de negocio de cuentas e inicio de sesión.
 *
 * Cuando llega aquí, los datos ya pasaron la validación de FORMA con Zod
 * (validate.middleware). Esta capa aplica las reglas que dependen de la BD:
 *   1. Correo y matrícula no deben existir → 409 CONFLICT.
 *   2. La contraseña se guarda como hash BCrypt (costo BCRYPT_COST >= 10).
 *   3. Se devuelve el usuario público (UsuarioDTO), jamás el hash.
 */
import bcrypt from 'bcryptjs';
import { env } from '../../config/env';
import type {
  CrearUsuarioRequest,
  LoginRequest,
  RegistroRequest,
  Rol,
  UsuarioDTO,
} from '../../schemas/api.contracts';
import { AppError } from '../../types/http.types';
import {
  buscarDuplicados,
  buscarPorCorreo,
  insertarUsuario,
  listarUsuarios as listarUsuariosRepo,
  type Duplicados,
  type FiltrosUsuarios,
} from './identidad.repository';

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

interface DatosCuenta {
  nombre: string;
  correo: string;
  contrasena: string;
  matricula: string | null;
  rol: Rol;
}

/**
 * Crea una cuenta: verifica duplicados, hashea con BCrypt e inserta.
 * Lo comparten el autorregistro (solo Alumno) y el alta por Administrador.
 */
const crearCuenta = async (datos: DatosCuenta): Promise<UsuarioDTO> => {
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

/** Autorregistro público. El esquema Zod ya garantizó que rol === 'Alumno'. */
export const registrarAlumno = (datos: RegistroRequest): Promise<UsuarioDTO> => crearCuenta(datos);

/** Alta por Administrador (POST /usuarios): único camino para crear Docente, Personal o Administrador. */
export const crearUsuario = (datos: CrearUsuarioRequest): Promise<UsuarioDTO> =>
  crearCuenta({ ...datos, matricula: datos.matricula ?? null });

export const listarUsuarios = (filtros: FiltrosUsuarios) => listarUsuariosRepo(filtros);

/* ---- Inicio de sesión (SCRUM-15) -------------------------------------------- */

/**
 * Bloqueo por fuerza bruta (RNF-004): 5 contraseñas incorrectas en 15 min
 * bloquean ese correo durante 15 min → 429.
 * Se guarda en memoria del proceso: se reinicia al reiniciar el servidor y no se
 * comparte entre varias instancias (suficiente para un solo contenedor backend).
 */
const MAX_INTENTOS = 5;
const VENTANA_MS = 15 * 60 * 1000;
const intentosFallidos = new Map<string, { fallos: number; desde: number; bloqueadoHasta: number }>();

const verificarBloqueo = (correo: string): void => {
  const registro = intentosFallidos.get(correo);
  if (!registro) return;
  const ahora = Date.now();
  if (registro.bloqueadoHasta > ahora) {
    const minutos = Math.ceil((registro.bloqueadoHasta - ahora) / 60_000);
    throw new AppError(
      429,
      'TOO_MANY_REQUESTS',
      `Demasiados intentos fallidos. Intenta de nuevo en ${minutos} minuto${minutos === 1 ? '' : 's'}.`,
    );
  }
  if (ahora - registro.desde > VENTANA_MS) intentosFallidos.delete(correo);
};

const registrarFallo = (correo: string): void => {
  const ahora = Date.now();
  const previo = intentosFallidos.get(correo);
  const registro =
    previo && ahora - previo.desde <= VENTANA_MS ? previo : { fallos: 0, desde: ahora, bloqueadoHasta: 0 };
  registro.fallos += 1;
  if (registro.fallos >= MAX_INTENTOS) registro.bloqueadoHasta = ahora + VENTANA_MS;
  intentosFallidos.set(correo, registro);
};

const errorCampo = (status: number, code: 'NOT_FOUND' | 'UNAUTHENTICATED', campo: string, mensaje: string) =>
  new AppError(status, code, mensaje, { campos: [{ ruta: `body.${campo}`, mensaje, codigo: code.toLowerCase() }] });

/**
 * Verifica credenciales. La contraseña se compara SIEMPRE contra el hash BCrypt
 * (bcrypt.compare); nunca se guarda ni se compara en texto plano.
 */
export const iniciarSesion = async (datos: LoginRequest): Promise<UsuarioDTO> => {
  verificarBloqueo(datos.correo);

  const usuario = await buscarPorCorreo(datos.correo);
  if (!usuario) {
    throw errorCampo(404, 'NOT_FOUND', 'correo', 'Esta cuenta no está registrada. Crea una cuenta para continuar.');
  }

  const coincide = await bcrypt.compare(datos.contrasena, usuario.contrasena_hash);
  if (!coincide) {
    registrarFallo(datos.correo);
    throw errorCampo(401, 'UNAUTHENTICATED', 'contrasena', 'La contraseña es incorrecta.');
  }

  if (!usuario.activo) {
    throw AppError.forbidden('Tu cuenta está desactivada. Contacta al administrador.');
  }

  intentosFallidos.delete(datos.correo);
  const { contrasena_hash: _hash, ...publico } = usuario;
  return publico;
};
