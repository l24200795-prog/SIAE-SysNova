/**
 * SIAE - Tipos HTTP compartidos (SCRUM-14).
 * Sobre de respuesta estándar de la API y error de aplicación tipado.
 */

/** Códigos de error de negocio estables que el frontend puede interpretar. */
export type ErrorCode =
  | 'VALIDATION_ERROR' // 400
  | 'BAD_REQUEST' // 400
  | 'UNAUTHENTICATED' // 401
  | 'FORBIDDEN' // 403 (RBAC / anti-IDOR, RNF-003)
  | 'NOT_FOUND' // 404
  | 'CONFLICT' // 409 (duplicados, integridad referencial)
  | 'CUPO_AGOTADO' // 409 (RN-002, inscripción concurrente)
  | 'PERIODO_NO_ACTIVO' // 409 (RN-001)
  | 'PAYLOAD_TOO_LARGE' // 413 (límite de PARAMETRO_SISTEMA)
  | 'UNSUPPORTED_MEDIA_TYPE' // 415
  | 'TOO_MANY_REQUESTS' // 429 (bloqueo por fuerza bruta, RNF-004)
  | 'INTERNAL_ERROR'; // 500

export interface ApiErrorBody {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

export interface ApiSuccess<T> {
  ok: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiFailure {
  ok: false;
  error: ApiErrorBody;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

/** Error lanzado por controladores/servicios; el error.middleware lo traduce a JSON. */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: unknown;

  constructor(statusCode: number, code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message: string, details?: unknown): AppError {
    return new AppError(400, 'BAD_REQUEST', message, details);
  }
  static unauthenticated(message = 'Sesión no válida o expirada'): AppError {
    return new AppError(401, 'UNAUTHENTICATED', message);
  }
  static forbidden(message = 'No tienes permiso para acceder a este recurso'): AppError {
    return new AppError(403, 'FORBIDDEN', message);
  }
  static notFound(message = 'Recurso no encontrado'): AppError {
    return new AppError(404, 'NOT_FOUND', message);
  }
  static conflict(message: string, code: ErrorCode = 'CONFLICT', details?: unknown): AppError {
    return new AppError(409, code, message, details);
  }
}

/** Helper para respuestas exitosas homogéneas. */
export const ok = <T>(data: T, meta?: Record<string, unknown>): ApiSuccess<T> =>
  meta ? { ok: true, data, meta } : { ok: true, data };
