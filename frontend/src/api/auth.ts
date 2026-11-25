/**
 * Endpoints de identidad (MOD-005). Los tipos reflejan RegistroRequest y
 * UsuarioDTO de backend/src/schemas/api.contracts.ts.
 */
import { apiPost } from './client';

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
