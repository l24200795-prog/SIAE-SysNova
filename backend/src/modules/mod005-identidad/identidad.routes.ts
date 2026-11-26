/**
 * MOD-005 · Identidad — Routers Express (ver app.ts):
 *   identidadRouter → /api/v1/auth      (registro, login, logout, me)
 *   usuariosRouter  → /api/v1/usuarios  (solo Administrador)
 *
 * Recuperar/restablecer contraseña (SCRUM-16) queda pendiente: requiere SMTP
 * configurado en backend/.env y Nodemailer.
 */
import { Router } from 'express';
import { env } from '../../config/env';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  buildLoginSchema,
  buildRegistroSchema,
  crearUsuarioSchema,
  listarUsuariosQuerySchema,
} from '../../schemas/api.contracts';
import { crear, listar, login, logout, me, registrar } from './identidad.controller';

export const identidadRouter = Router();

// Público: autorregistro de Alumno (SCRUM-11 / HU-008D).
identidadRouter.post(
  '/registro',
  validate({ body: buildRegistroSchema(env.CORREO_DOMINIO_INSTITUCIONAL) }),
  registrar,
);

// SCRUM-15: sesión con JWT en cookie HttpOnly.
identidadRouter.post('/login', validate({ body: buildLoginSchema(env.CORREO_DOMINIO_INSTITUCIONAL) }), login);
identidadRouter.post('/logout', logout);
identidadRouter.get('/me', requireAuth, me);

// SCRUM-17: administración de cuentas. El rol se verifica en el SERVIDOR (RBAC).
export const usuariosRouter = Router();
usuariosRouter.use(requireAuth, requireRole('Administrador'));
usuariosRouter.get('/', validate({ query: listarUsuariosQuerySchema }), listar);
usuariosRouter.post('/', validate({ body: crearUsuarioSchema }), crear);
