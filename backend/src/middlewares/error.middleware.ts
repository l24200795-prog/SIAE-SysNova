/**
 * SIAE - Manejo global de errores (SCRUM-14).
 *
 * Traduce cualquier error a un sobre JSON homogéneo:
 *   { ok: false, error: { code, message, details? } }
 *
 * Mapeos:
 *  - ZodError                      → 400 VALIDATION_ERROR (con detalle por campo)
 *  - AppError                      → su statusCode / code
 *  - JSON mal formado              → 400 BAD_REQUEST
 *  - MySQL ER_DUP_ENTRY            → 409 CONFLICT (p. ej. UK_alumno_actividad, RN-007)
 *  - MySQL ER_ROW_IS_REFERENCED_*  → 409 CONFLICT (ON DELETE RESTRICT → usar baja lógica)
 *  - MySQL ER_NO_REFERENCED_ROW_*  → 400 BAD_REQUEST (FK inexistente: aula, periodo, responsable)
 *  - MySQL ER_CHECK_CONSTRAINT_*   → 400 BAD_REQUEST
 *  - MySQL ER_LOCK_DEADLOCK / WAIT → 409 CONFLICT reintentable (inscripción concurrente)
 *  - Multer LIMIT_FILE_SIZE        → 413 PAYLOAD_TOO_LARGE
 *  - Cualquier otro                → 500 INTERNAL_ERROR (sin stack en producción)
 */
import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { isProduction } from '../config/env';
import { AppError, type ApiFailure, type ErrorCode } from '../types/http.types';

interface MysqlLikeError {
  code: string;
  errno?: number;
  sqlMessage?: string;
}

const isMysqlError = (err: unknown): err is MysqlLikeError =>
  typeof err === 'object' &&
  err !== null &&
  typeof (err as { code?: unknown }).code === 'string' &&
  ('sqlMessage' in err || 'errno' in err);

const isMulterError = (err: unknown): err is { name: string; code: string; field?: string } =>
  typeof err === 'object' && err !== null && (err as { name?: unknown }).name === 'MulterError';

const isJsonSyntaxError = (err: unknown): boolean =>
  err instanceof SyntaxError &&
  typeof (err as { status?: unknown }).status === 'number' &&
  'body' in err;

const send = (
  res: Response,
  status: number,
  code: ErrorCode,
  message: string,
  details?: unknown,
): void => {
  const body: ApiFailure = {
    ok: false,
    error: details === undefined ? { code, message } : { code, message, details },
  };
  res.status(status).json(body);
};

/** 404 para rutas /api no registradas. Montar después de todos los routers. */
export const notFoundHandler = (req: Request, res: Response): void => {
  send(res, 404, 'NOT_FOUND', `Ruta no encontrada: ${req.method} ${req.originalUrl}`);
};

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (res.headersSent) {
    next(err);
    return;
  }

  // 1) Validación Zod
  if (err instanceof ZodError) {
    send(res, 400, 'VALIDATION_ERROR', 'Los datos enviados no son válidos', {
      campos: err.issues.map((i) => ({
        ruta: i.path.join('.'),
        mensaje: i.message,
        codigo: i.code,
      })),
    });
    return;
  }

  // 2) Errores de aplicación controlados
  if (err instanceof AppError) {
    send(res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  // 3) JSON mal formado (express.json)
  if (isJsonSyntaxError(err)) {
    send(res, 400, 'BAD_REQUEST', 'El cuerpo de la petición no es un JSON válido');
    return;
  }

  // 4) Multer (MOD-004). El límite real viene de PARAMETRO_SISTEMA.tamano_maximo_mb.
  if (isMulterError(err)) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      send(res, 413, 'PAYLOAD_TOO_LARGE', 'El archivo excede el tamaño máximo permitido');
      return;
    }
    send(res, 400, 'BAD_REQUEST', 'Error al procesar el archivo enviado', { codigo: err.code });
    return;
  }

  // 5) MySQL 8 (mysql2)
  if (isMysqlError(err)) {
    switch (err.code) {
      case 'ER_DUP_ENTRY':
        send(res, 409, 'CONFLICT', 'El registro ya existe (valor único duplicado)');
        return;
      case 'ER_ROW_IS_REFERENCED':
      case 'ER_ROW_IS_REFERENCED_2':
        send(
          res,
          409,
          'CONFLICT',
          'El registro tiene información vinculada; aplica baja lógica en lugar de eliminarlo (RN-007)',
        );
        return;
      case 'ER_NO_REFERENCED_ROW':
      case 'ER_NO_REFERENCED_ROW_2':
        send(res, 400, 'BAD_REQUEST', 'Una referencia enviada no existe (periodo, aula, usuario o actividad)');
        return;
      case 'ER_CHECK_CONSTRAINT_VIOLATED':
        send(res, 400, 'BAD_REQUEST', 'Los datos violan una restricción de integridad del sistema');
        return;
      case 'ER_LOCK_DEADLOCK':
      case 'ER_LOCK_WAIT_TIMEOUT':
        send(res, 409, 'CONFLICT', 'Alta concurrencia en este recurso, intenta de nuevo', {
          reintentable: true,
        });
        return;
      default:
        break;
    }
  }

  // 6) Fallback: nunca exponer detalles internos en producción
  // eslint-disable-next-line no-console
  console.error(`[SIAE] Error no controlado en ${req.method} ${req.originalUrl}:`, err);
  send(
    res,
    500,
    'INTERNAL_ERROR',
    'Ocurrió un error interno en el servidor',
    isProduction ? undefined : { causa: err instanceof Error ? err.message : String(err) },
  );
};
