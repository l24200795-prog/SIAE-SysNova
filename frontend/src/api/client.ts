/**
 * Cliente HTTP mínimo para la API de SIAE.
 *
 * La API siempre responde con el mismo "sobre":
 *   Éxito: { ok: true,  data }
 *   Error: { ok: false, error: { code, message, details? } }
 * Este archivo lo interpreta y, si hay error, lanza un ApiError con la
 * información lista para mostrarse en pantalla.
 */

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1').replace(/\/$/, '');

interface CampoErrorApi {
  ruta: string; // p. ej. "body.correo"
  mensaje: string;
  codigo?: string;
}

type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; details?: { campos?: CampoErrorApi[] } } };

export class ApiError extends Error {
  /** Código HTTP (0 si no hubo respuesta del servidor). */
  readonly status: number;
  /** Código de negocio: VALIDATION_ERROR, CONFLICT, INTERNAL_ERROR, NETWORK_ERROR... */
  readonly code: string;
  /** Errores por campo, sin el prefijo "body.": { correo: 'Este correo ya está registrado' }. */
  readonly campos: Record<string, string>;

  constructor(status: number, code: string, message: string, campos: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.campos = campos;
  }
}

const camposPorNombre = (campos: CampoErrorApi[] = []): Record<string, string> => {
  const resultado: Record<string, string> = {};
  for (const c of campos) {
    const nombre = c.ruta.replace(/^body\./, '');
    // Si un campo trae varios errores, mostramos el primero.
    if (nombre && !resultado[nombre]) resultado[nombre] = c.mensaje;
  }
  return resultado;
};

type Metodo = 'GET' | 'POST';

async function apiRequest<T>(metodo: Metodo, ruta: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${ruta}`, {
      method: metodo,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      credentials: 'include', // envía/recibe la cookie HttpOnly de sesión
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'No se pudo conectar con el servidor. Verifica tu conexión o intenta más tarde.',
    );
  }

  let json: ApiResponse<T>;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError(res.status, 'INVALID_RESPONSE', 'El servidor respondió de forma inesperada.');
  }

  if (!json.ok) {
    throw new ApiError(
      res.status,
      json.error.code,
      json.error.message,
      camposPorNombre(json.error.details?.campos),
    );
  }
  return json.data;
}

export const apiGet = <T>(ruta: string): Promise<T> => apiRequest<T>('GET', ruta);
export const apiPost = <T>(ruta: string, body: unknown = {}): Promise<T> => apiRequest<T>('POST', ruta, body);
