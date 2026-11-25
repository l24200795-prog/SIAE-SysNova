/**
 * Validación del formulario de registro en el navegador.
 *
 * Es solo para dar mensajes rápidos al usuario (UX). El backend vuelve a
 * validar TODO con Zod y es la autoridad final. Las reglas copian las de
 * buildRegistroSchema en backend/src/schemas/api.contracts.ts.
 */

export const DOMINIO_INSTITUCIONAL = 'pachuca.tecnm.mx';

export interface RegistroForm {
  nombre: string;
  correo: string;
  matricula: string;
  rol: string;
  contrasena: string;
  confirmacion: string;
}

export type CampoRegistro = keyof RegistroForm;
export type ErroresRegistro = Partial<Record<CampoRegistro, string>>;

const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FORMATO_MATRICULA = /^[A-Za-z0-9]+$/;

/** Devuelve el mensaje de error de un campo, o undefined si es válido. */
export function validarCampo(campo: CampoRegistro, form: RegistroForm): string | undefined {
  switch (campo) {
    case 'nombre': {
      const v = form.nombre.trim();
      if (!v) return 'El nombre es obligatorio';
      if (v.length > 150) return 'El nombre admite máximo 150 caracteres';
      return undefined;
    }
    case 'correo': {
      const v = form.correo.trim().toLowerCase();
      if (!v) return 'El correo es obligatorio';
      if (v.length > 150) return 'El correo admite máximo 150 caracteres';
      if (!FORMATO_CORREO.test(v)) return 'Formato de correo inválido';
      if (!v.endsWith(`@${DOMINIO_INSTITUCIONAL}`)) {
        return `Debe ser un correo institucional (@${DOMINIO_INSTITUCIONAL})`;
      }
      return undefined;
    }
    case 'matricula': {
      const v = form.matricula.trim();
      if (form.rol === 'Alumno' && !v) return 'La matrícula es obligatoria para el rol Alumno';
      if (v.length > 10) return 'La matrícula admite máximo 10 caracteres';
      if (v && !FORMATO_MATRICULA.test(v)) return 'La matrícula solo admite letras y números';
      return undefined;
    }
    case 'rol':
      if (!form.rol) return 'Selecciona un rol';
      if (form.rol !== 'Alumno') return 'Solo el rol Alumno puede registrarse';
      return undefined;
    case 'contrasena':
      if (!form.contrasena) return 'La contraseña es obligatoria';
      if (form.contrasena.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
      if (form.contrasena.length > 72) return 'La contraseña admite máximo 72 caracteres';
      return undefined;
    case 'confirmacion':
      if (!form.confirmacion) return 'Confirma tu contraseña';
      if (form.confirmacion !== form.contrasena) return 'Las contraseñas no coinciden';
      return undefined;
  }
}

/** Valida todo el formulario. Objeto vacío = sin errores. */
export function validarRegistro(form: RegistroForm): ErroresRegistro {
  const errores: ErroresRegistro = {};
  for (const campo of Object.keys(form) as CampoRegistro[]) {
    const error = validarCampo(campo, form);
    if (error) errores[campo] = error;
  }
  return errores;
}
