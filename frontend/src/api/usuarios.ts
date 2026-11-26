/**
 * Administración de cuentas (MOD-005 · SCRUM-17). Solo Administrador: el
 * backend responde 403 a cualquier otro rol aunque se llame desde el navegador.
 */
import type { Rol, UsuarioDTO } from './auth';
import { apiGet, apiPost } from './client';

export interface CrearUsuarioRequest {
  nombre: string;
  correo: string;
  contrasena: string;
  rol: Rol;
  matricula: string | null;
}

/** GET /usuarios → últimos usuarios registrados (máx. 100). */
export const listarUsuarios = (): Promise<UsuarioDTO[]> => apiGet<UsuarioDTO[]>('/usuarios?limit=100');

/** POST /usuarios → 201 con el usuario creado. */
export const crearUsuario = (datos: CrearUsuarioRequest): Promise<UsuarioDTO> =>
  apiPost<UsuarioDTO>('/usuarios', datos);
