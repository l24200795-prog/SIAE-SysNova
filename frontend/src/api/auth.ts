/**
 * Endpoints de identidad (MOD-005). Los tipos reflejan RegistroRequest,
 * LoginRequest, UsuarioDTO y SesionDTO de backend/src/schemas/api.contracts.ts.
 */
import { apiGet, apiPost } from './client';

export type Rol = 'Administrador' | 'Personal' | 'Docente' | 'Alumno';

export interface RegistroRequest {
  nombre: string;
  correo: string;
  contrasena: string;
  matricula: string;
  rol: 'Alumno';
}

export interface UsuarioDTO {
  id_usuario: number;
  matricula: string | null;
  nombre: string;
  correo: string;
  rol: Rol;
  activo: boolean;
}

/** POST /auth/registro → 201 con el usuario creado. */
export const registrarUsuario = (datos: RegistroRequest): Promise<UsuarioDTO> =>
  apiPost<UsuarioDTO>('/auth/registro', datos);

export interface LoginRequest {
  correo: string;
  contrasena: string;
}

export interface SesionDTO {
  usuario: UsuarioDTO;
  actividades_responsable: number[];
}

/** POST /auth/login → 200 con la sesión; el JWT llega en una cookie HttpOnly (JS no la ve). */
export const iniciarSesion = (datos: LoginRequest): Promise<SesionDTO> =>
  apiPost<SesionDTO>('/auth/login', datos);

/** GET /auth/me → sesión actual, o ApiError 401 si no hay sesión. */
export const obtenerSesion = (): Promise<SesionDTO> => apiGet<SesionDTO>('/auth/me');

/** POST /auth/logout → el servidor borra la cookie. */
export const cerrarSesion = (): Promise<unknown> => apiPost('/auth/logout');

export interface SolicitarRecuperacionRequest {
  correo: string;
}

/**
 * POST /auth/recuperar → 200 genérico (no revela si el correo existe).
 * Pendiente en el backend (SCRUM-16): aún no se llama desde la interfaz.
 */
export const solicitarRecuperacion = (datos: SolicitarRecuperacionRequest): Promise<unknown> =>
  apiPost('/auth/recuperar', datos);
