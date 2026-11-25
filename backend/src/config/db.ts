/**
 * SIAE - Pool de conexiones MySQL 8 (driver nativo mysql2, sin ORM).
 *
 * Un pool reutiliza conexiones abiertas en lugar de abrir una nueva por cada
 * petición. Se crea una sola vez y todos los repositorios lo importan.
 *
 * Reglas:
 *  - Usar SIEMPRE consultas parametrizadas (pool.execute(sql, [valores])),
 *    nunca concatenar valores en el SQL (previene inyección SQL).
 *  - Las credenciales salen de env.ts (backend/.env), nunca del código.
 */
import mysql, { type Pool } from 'mysql2/promise';
import { env } from './env';

export const pool: Pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  connectionLimit: env.DB_CONNECTION_LIMIT,
  waitForConnections: true,
  charset: 'utf8mb4',
});

/** Cierra el pool en el apagado ordenado del servidor (server.ts). */
export const closePool = (): Promise<void> => pool.end();
