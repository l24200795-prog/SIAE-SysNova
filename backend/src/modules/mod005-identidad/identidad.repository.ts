/**
 * MOD-005 · Identidad — Acceso a datos de USUARIO (SQL con mysql2).
 *
 * Esta capa SOLO habla con la base de datos. No conoce HTTP ni reglas de
 * negocio. Todas las consultas son parametrizadas (los "?" se rellenan de
 * forma segura por mysql2), nunca se concatenan valores en el SQL.
 */
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../../config/db';
import type { Rol, UsuarioDTO } from '../../schemas/api.contracts';

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

/* ---- Inicio de sesión y administración de usuarios (SCRUM-15 / SCRUM-17) ---- */

interface UsuarioRow extends RowDataPacket {
  id_usuario: number;
  matricula: string | null;
  nombre: string;
  correo: string;
  contrasena_hash: string;
  rol: Rol;
  activo: number; // BOOLEAN de MySQL = TINYINT(1)
}

/** Usuario con su hash: SOLO para uso interno del servicio (login). Nunca se responde tal cual. */
export type UsuarioConHash = UsuarioDTO & { contrasena_hash: string };

const COLUMNAS_PUBLICAS = 'id_usuario, matricula, nombre, correo, rol, activo';

const aUsuarioDTO = (r: UsuarioRow): UsuarioDTO => ({
  id_usuario: r.id_usuario,
  matricula: r.matricula,
  nombre: r.nombre,
  correo: r.correo,
  rol: r.rol,
  activo: Boolean(r.activo),
});

/** Busca por correo (incluye el hash para compararlo con BCrypt). */
export const buscarPorCorreo = async (correo: string): Promise<UsuarioConHash | null> => {
  const [rows] = await pool.execute<UsuarioRow[]>(
    `SELECT ${COLUMNAS_PUBLICAS}, contrasena_hash FROM USUARIO WHERE correo = ? LIMIT 1`,
    [correo],
  );
  return rows[0] ? { ...aUsuarioDTO(rows[0]), contrasena_hash: rows[0].contrasena_hash } : null;
};

/** Busca por id. Lo usa requireAuth para confirmar que la cuenta sigue activa y con el mismo rol. */
export const buscarPorId = async (id_usuario: number): Promise<UsuarioDTO | null> => {
  const [rows] = await pool.execute<UsuarioRow[]>(
    `SELECT ${COLUMNAS_PUBLICAS} FROM USUARIO WHERE id_usuario = ? LIMIT 1`,
    [id_usuario],
  );
  return rows[0] ? aUsuarioDTO(rows[0]) : null;
};

export interface FiltrosUsuarios {
  page: number;
  limit: number;
  rol?: Rol;
  activo?: boolean;
  q?: string;
}

/** Lista paginada de usuarios (sin hash). Los filtros se agregan como fragmentos fijos + parámetros. */
export const listarUsuarios = async (
  f: FiltrosUsuarios,
): Promise<{ usuarios: UsuarioDTO[]; total: number }> => {
  const condiciones: string[] = [];
  const valores: unknown[] = [];
  if (f.rol) {
    condiciones.push('rol = ?');
    valores.push(f.rol);
  }
  if (f.activo !== undefined) {
    condiciones.push('activo = ?');
    valores.push(f.activo);
  }
  if (f.q) {
    condiciones.push('(nombre LIKE ? OR correo LIKE ? OR matricula LIKE ?)');
    const patron = `%${f.q}%`;
    valores.push(patron, patron, patron);
  }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  // pool.query (no execute) porque MySQL 8 no acepta LIMIT/OFFSET como parámetros
  // de sentencia preparada; mysql2 sigue escapando los valores de forma segura.
  const [rows] = await pool.query<UsuarioRow[]>(
    `SELECT ${COLUMNAS_PUBLICAS} FROM USUARIO ${where} ORDER BY id_usuario DESC LIMIT ? OFFSET ?`,
    [...valores, f.limit, (f.page - 1) * f.limit],
  );
  const [conteo] = await pool.query<(RowDataPacket & { total: number })[]>(
    `SELECT COUNT(*) AS total FROM USUARIO ${where}`,
    valores,
  );
  return {
    usuarios: rows.map(aUsuarioDTO),
    total: Number(conteo[0]?.total ?? 0),
  };
};
