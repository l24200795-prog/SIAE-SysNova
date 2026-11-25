/**
 * MOD-005 · Identidad — Acceso a datos de USUARIO (SQL con mysql2).
 *
 * Esta capa SOLO habla con la base de datos. No conoce HTTP ni reglas de
 * negocio. Todas las consultas son parametrizadas (los "?" se rellenan de
 * forma segura por mysql2), nunca se concatenan valores en el SQL.
 */
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../../config/db';
import type { Rol } from '../../schemas/api.contracts';

export interface NuevoUsuario {
  matricula: string | null;
  nombre: string;
  correo: string;
  contrasena_hash: string;
  rol: Rol;
}

export interface Duplicados {
  correo: boolean;
  matricula: boolean;
}

interface DuplicadoRow extends RowDataPacket {
  correo: string;
  matricula: string | null;
}

/** Indica si ya existe un usuario con ese correo y/o esa matrícula. */
export const buscarDuplicados = async (
  correo: string,
  matricula: string | null,
): Promise<Duplicados> => {
  const [rows] = await pool.execute<DuplicadoRow[]>(
    'SELECT correo, matricula FROM USUARIO WHERE correo = ? OR matricula = ? LIMIT 2',
    [correo, matricula],
  );
  return {
    correo: rows.some((r) => r.correo === correo),
    matricula: matricula !== null && rows.some((r) => r.matricula === matricula),
  };
};

/** Inserta el usuario y devuelve su id_usuario generado. */
export const insertarUsuario = async (usuario: NuevoUsuario): Promise<number> => {
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO USUARIO (matricula, nombre, correo, contrasena_hash, rol) VALUES (?, ?, ?, ?, ?)',
    [usuario.matricula, usuario.nombre, usuario.correo, usuario.contrasena_hash, usuario.rol],
  );
  return result.insertId;
};
