/**
 * MOD-005 · Identidad — Router Express montado en /api/v1/auth (ver app.ts).
 *
 * Aquí se agregarán login, logout, me, recuperar y restablecer (SCRUM-15/16).
 */
import { Router } from 'express';
import { env } from '../../config/env';
import { validate } from '../../middlewares/validate.middleware';
import { buildRegistroSchema } from '../../schemas/api.contracts';
import { registrar } from './identidad.controller';

export const identidadRouter = Router();

// Público: autorregistro de Alumno (SCRUM-11 / HU-008D).
identidadRouter.post(
  '/registro',
  validate({ body: buildRegistroSchema(env.CORREO_DOMINIO_INSTITUCIONAL) }),
  registrar,
);
