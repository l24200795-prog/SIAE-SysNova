/**
 * SIAE - Autenticación (JWT en cookie HttpOnly) y autorización por rol (RBAC).
 * SCRUM-15 / RNF-003.
 *
 * Uso en un router:
 *   router.get('/usuarios', requireAuth, requireRole('Administrador'), controller.listar);
 *
 * - requireAuth: lee la cookie, verifica la firma y vigencia del JWT y vuelve a
 *   consultar al usuario en BD. Así, si un administrador desactiva una cuenta o
 *   le cambia el rol, el cambio aplica de inmediato aunque el token siga vigente.
 *   Deja el usuario en req.usuario. Sin sesión válida → 401 UNAUTHENTICATED.
 * - requireRole(...roles): debe ir DESPUÉS de requireAuth. Rol no permitido → 403.
 *
 * La identidad SIEMPRE sale de aquí (del token), nunca del body/params/query.
 */
import type { CookieOptions, NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env, isProduction } from '../config/env';
import { buscarPorId } from '../modules/mod005-identidad/identidad.repository';
import type { JwtPayload, Rol, UsuarioDTO } from '../schemas/api.contracts';
import { AppError } from '../types/http.types';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Usuario autenticado (lo coloca requireAuth). */
      usuario?: UsuarioDTO;
    }
  }
}

const ALGORITMO = 'HS256' as const;

/** Firma el JWT de sesión con el mínimo indispensable (JwtPayload del contrato). */
export const emitirToken = (usuario: UsuarioDTO): string => {
  const payload: JwtPayload = { sub: usuario.id_usuario, rol: usuario.rol, matricula: usuario.matricula };
  return jwt.sign(payload, env.JWT_SECRET, {
    algorithm: ALGORITMO,
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
};

/** Opciones de la cookie: HttpOnly (JS no la lee), Secure en producción (HTTPS), SameSite=Lax. */
export const opcionesCookie = (token?: string): CookieOptions => {
  const base: CookieOptions = { httpOnly: true, secure: isProduction, sameSite: 'lax', path: '/' };
  if (!token) return base;
  // La cookie dura lo mismo que el token (exp viene en segundos).
  const { exp } = jwt.decode(token) as { exp?: number };
  return exp ? { ...base, expires: new Date(exp * 1000) } : base;
};

const leerPayload = (token: string): JwtPayload | null => {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: [ALGORITMO] });
    if (typeof decoded === 'string') return null;
    const sub = Number(decoded.sub);
    if (!Number.isInteger(sub) || sub <= 0) return null;
    return { sub, rol: decoded.rol as Rol, matricula: (decoded.matricula as string | null) ?? null };
  } catch {
    return null; // firma inválida, token mal formado o expirado
  }
};

export const requireAuth: RequestHandler = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const token: unknown = req.cookies?.[env.COOKIE_NAME];
    const payload = typeof token === 'string' && token ? leerPayload(token) : null;
    if (!payload) throw AppError.unauthenticated();

    const usuario = await buscarPorId(payload.sub);
    if (!usuario || !usuario.activo) throw AppError.unauthenticated();

    req.usuario = usuario;
    next();
  } catch (err) {
    next(err);
  }
};

export const requireRole =
  (...roles: Rol[]): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.usuario) {
      next(AppError.unauthenticated());
      return;
    }
    if (!roles.includes(req.usuario.rol)) {
      next(AppError.forbidden());
      return;
    }
    next();
  };
