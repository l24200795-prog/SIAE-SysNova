/**
 * SIAE - Seed del administrador inicial.
 *
 * Uso (desde backend/):   npm run seed:admin
 *
 * - Usuario:  admin.siae  →  correo admin.siae@<CORREO_DOMINIO_INSTITUCIONAL>
 *   (el "usuario" para iniciar sesión es la parte del correo antes de la @).
 * - La contraseña temporal se lee de SEED_ADMIN_PASSWORD en backend/.env (nunca
 *   del código) y se guarda SOLO como hash BCrypt.
 * - Idempotente: si ya existe una cuenta con ese correo, no crea otra ni cambia
 *   su contraseña.
 * - La cuenta Administrador solo puede nacer aquí o por POST /usuarios (otro
 *   Administrador); el registro público únicamente crea Alumnos.
 */
import bcrypt from 'bcryptjs';
import { closePool } from '../config/db';
import { env } from '../config/env';
import { buscarPorCorreo, insertarUsuario } from '../modules/mod005-identidad/identidad.repository';
import { contrasenaSchema } from '../schemas/api.contracts';

const USUARIO_ADMIN = 'admin.siae';
const NOMBRE_ADMIN = 'Administrador SIAE';

const main = async (): Promise<number> => {
  const correo = `${USUARIO_ADMIN}@${env.CORREO_DOMINIO_INSTITUCIONAL}`.toLowerCase();

  const existente = await buscarPorCorreo(correo);
  if (existente) {
    console.log(`[seed] Ya existe la cuenta ${correo} (rol ${existente.rol}). No se creó otra.`);
    return 0;
  }

  const validacion = contrasenaSchema.safeParse(env.SEED_ADMIN_PASSWORD ?? '');
  if (!env.SEED_ADMIN_PASSWORD || !validacion.success) {
    console.error('[seed] Define SEED_ADMIN_PASSWORD en backend/.env (8 a 72 caracteres) y vuelve a ejecutar.');
    return 1;
  }

  const contrasena_hash = await bcrypt.hash(env.SEED_ADMIN_PASSWORD, env.BCRYPT_COST);
  const id = await insertarUsuario({
    matricula: null,
    nombre: NOMBRE_ADMIN,
    correo,
    contrasena_hash,
    rol: 'Administrador',
  });
  console.log(`[seed] Administrador creado: ${correo} (id_usuario ${id}). Cambia la contraseña temporal tras el primer inicio de sesión.`);
  return 0;
};

main()
  .then((codigo) => {
    process.exitCode = codigo;
  })
  .catch((err: unknown) => {
    console.error('[seed] Error:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => closePool());
