/**
 * MOD-005 · Identidad — Controladores HTTP.
 *
 * Traducen HTTP ↔ servicio: toman el body ya validado, llaman al servicio y
 * responden con el sobre estándar { ok: true, data }. Los errores se pasan a
 * next() para que error.middleware genere el JSON (400, 401, 403, 404, 409, 429...).
 */
import type { NextFunction, Request, Response } from 'express';
import { env } from '../../config/env';
import { emitirToken, opcionesCookie } from '../../middlewares/auth.middleware';
import type {
  CrearUsuarioRequest,
  LoginRequest,
  RegistroRequest,
  SesionDTO,
  UsuarioDTO,
} from '../../schemas/api.contracts';
import { AppError, ok } from '../../types/http.types';
import type { FiltrosUsuarios } from './identidad.repository';
import { crearUsuario, iniciarSesion, listarUsuarios, registrarAlumno } from './identidad.service';

/**
 * SesionDTO del contrato. actividades_responsable (RN-008) queda vacío hasta que
 * exista la tabla ACTIVIDAD (MOD-002 · SCRUM-24).
 */
const aSesion = (usuario: UsuarioDTO): SesionDTO => ({ usuario, actividades_responsable: [] });

/** POST /api/v1/auth/registro → 201 Created con el UsuarioDTO. */
export const registrar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const usuario = await registrarAlumno(req.body as RegistroRequest);
    res.status(201).json(ok(usuario));
  } catch (err) {
    next(err);
  }
};

/** POST /api/v1/auth/login → 200 con SesionDTO + Set-Cookie HttpOnly con el JWT. */
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const usuario = await iniciarSesion(req.body as LoginRequest);
    const token = emitirToken(usuario);
    res.cookie(env.COOKIE_NAME, token, opcionesCookie(token));
    res.status(200).json(ok(aSesion(usuario)));
  } catch (err) {
    next(err);
  }
};

/** POST /api/v1/auth/logout → borra la cookie de sesión. */
export const logout = (_req: Request, res: Response): void => {
  res.clearCookie(env.COOKIE_NAME, opcionesCookie());
  res.status(200).json(ok({ mensaje: 'Sesión cerrada' }));
};

/** GET /api/v1/auth/me → sesión actual (requireAuth ya cargó req.usuario). */
export const me = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.usuario) {
    next(AppError.unauthenticated());
    return;
  }
  res.status(200).json(ok(aSesion(req.usuario)));
};

/** GET /api/v1/usuarios (Administrador) → lista paginada. */
export const listar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filtros = req.query as unknown as FiltrosUsuarios;
    const { usuarios, total } = await listarUsuarios(filtros);
    res.status(200).json(ok(usuarios, { page: filtros.page, limit: filtros.limit, total }));
  } catch (err) {
    next(err);
  }
};

/** POST /api/v1/usuarios (Administrador) → 201 con el usuario creado. */
export const crear = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const usuario = await crearUsuario(req.body as CrearUsuarioRequest);
    res.status(201).json(ok(usuario));
  } catch (err) {
    next(err);
  }
};
