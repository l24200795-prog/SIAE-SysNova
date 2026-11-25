/**
 * MOD-005 · Identidad — Controladores HTTP.
 *
 * Traducen HTTP ↔ servicio: toman el body ya validado, llaman al servicio y
 * responden con el sobre estándar { ok: true, data }. Los errores se pasan a
 * next() para que error.middleware genere el JSON (400, 409, 500...).
 */
import type { NextFunction, Request, Response } from 'express';
import type { RegistroRequest } from '../../schemas/api.contracts';
import { ok } from '../../types/http.types';
import { registrarAlumno } from './identidad.service';

/** POST /api/v1/auth/registro → 201 Created con el UsuarioDTO. */
export const registrar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const usuario = await registrarAlumno(req.body as RegistroRequest);
    res.status(201).json(ok(usuario));
  } catch (err) {
    next(err);
  }
};
