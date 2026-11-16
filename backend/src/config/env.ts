/**
 * SIAE - Configuración de entorno tipada (SCRUM-14).
 *
 * Solo contiene configuración de INFRAESTRUCTURA (puertos, credenciales, orígenes).
 * Los límites de negocio (asistencia mínima, tamaño máximo de archivo, folios, etc.)
 * NO van aquí: se leen en tiempo de ejecución desde PARAMETRO_SISTEMA (RIES-DIS-003).
 */
import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  API_PREFIX: z.string().default('/api/v1'),

  /** Orígenes permitidos para CORS, separados por coma (ej. https://siae.itpachuca.edu.mx). */
  CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),

  /** Dominio institucional aceptado en el correo de inicio de sesión (Tabla 40). */
  CORREO_DOMINIO_INSTITUCIONAL: z.string().min(3).default('pachuca.tecnm.mx'),

  // MySQL 8 (driver nativo mysql2)
  DB_HOST: z.string().min(1).default('localhost'),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().min(1).default('siae_app'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().min(1).default('siae'),
  DB_CONNECTION_LIMIT: z.coerce.number().int().positive().default(10),

  // JWT en cookie HttpOnly/Secure
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('2h'),
  COOKIE_NAME: z.string().default('siae_session'),
  COOKIE_SECRET: z.string().min(32, 'COOKIE_SECRET debe tener al menos 32 caracteres'),

  BCRYPT_COST: z.coerce.number().int().min(10, 'BCrypt requiere costo >= 10 (CA-008-1)').default(12),

  // SMTP (Nodemailer)
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  SMTP_USER: z.string().default(''),
  SMTP_PASSWORD: z.string().default(''),
  SMTP_FROM: z.string().default('SIAE ITP <no-reply@pachuca.tecnm.mx>'),

  UPLOADS_DIR: z.string().default('uploads'),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Falla rápido: no arrancar el servidor con configuración inválida.
  // eslint-disable-next-line no-console
  console.error('[SIAE] Variables de entorno inválidas:', parsed.error.flatten().fieldErrors);
  throw new Error('Configuración de entorno inválida. Revisa backend/.env contra .env.example');
}

export const env: Readonly<Env> = Object.freeze(parsed.data);

export const isProduction = env.NODE_ENV === 'production';

export const corsOrigins: string[] = env.CORS_ORIGIN.split(',')
  .map((o) => o.trim())
  .filter(Boolean);
