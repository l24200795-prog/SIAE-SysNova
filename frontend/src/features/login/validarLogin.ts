/**
 * Validación del formulario de inicio de sesión (UX). El backend vuelve a
 * validar con buildLoginSchema y es la autoridad final.
 *
 * "Usuario" = la parte del correo institucional antes de la @. Así se puede
 * escribir "admin.siae" o "l24200824" en lugar del correo completo; aquí se
 * completa con el dominio y al backend siempre le llega el correo.
 */
import { DOMINIO_INSTITUCIONAL } from '../registro/validarRegistro';

export interface LoginForm {
  identificador: string;
  contrasena: string;
}

export type CampoLogin = keyof LoginForm;
export type ErroresLogin = Partial<Record<CampoLogin, string>>;

const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FORMATO_USUARIO = /^[^\s@]+$/;

/** Convierte "admin.siae" → "admin.siae@pachuca.tecnm.mx". Un correo completo se deja igual. */
export const aCorreo = (identificador: string): string => {
  const v = identificador.trim().toLowerCase();
  return v.includes('@') ? v : `${v}@${DOMINIO_INSTITUCIONAL}`;
};

export function validarCampoLogin(campo: CampoLogin, form: LoginForm): string | undefined {
  switch (campo) {
    case 'identificador': {
      const v = form.identificador.trim().toLowerCase();
      if (!v) return 'Escribe tu correo institucional o tu usuario';
      if (v.includes('@')) {
        if (!FORMATO_CORREO.test(v)) return 'Formato de correo inválido';
        if (!v.endsWith(`@${DOMINIO_INSTITUCIONAL}`)) {
          return `Usa tu correo institucional (@${DOMINIO_INSTITUCIONAL})`;
        }
      } else if (!FORMATO_USUARIO.test(v)) {
        return 'El usuario no puede contener espacios';
      }
      if (aCorreo(v).length > 150) return 'El correo admite máximo 150 caracteres';
      return undefined;
    }
    case 'contrasena':
      if (!form.contrasena) return 'Escribe tu contraseña';
      if (form.contrasena.length > 72) return 'La contraseña admite máximo 72 caracteres';
      return undefined;
  }
}

export function validarLogin(form: LoginForm): ErroresLogin {
  const errores: ErroresLogin = {};
  for (const campo of Object.keys(form) as CampoLogin[]) {
    const error = validarCampoLogin(campo, form);
    if (error) errores[campo] = error;
  }
  return errores;
}
