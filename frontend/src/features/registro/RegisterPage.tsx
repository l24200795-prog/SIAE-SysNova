/**
 * Pantalla de registro de cuenta (SCRUM-11 / HU-008D).
 *
 * Flujo:
 *  1. El usuario llena el formulario; cada campo se valida al salir de él (blur).
 *  2. Al enviar, se valida todo. Si hay errores, NO se llama a la API.
 *  3. Si todo está bien, se envía POST /auth/registro.
 *  4. 201 → mensaje de éxito y se limpia el formulario.
 *     400/409 → se muestran los mensajes del servidor debajo de cada campo.
 */
import { useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { ApiError } from '../../api/client';
import { registrarUsuario } from '../../api/auth';
import {
  DOMINIO_INSTITUCIONAL,
  validarCampo,
  validarRegistro,
  type CampoRegistro,
  type ErroresRegistro,
  type RegistroForm,
} from './validarRegistro';

const FORM_INICIAL: RegistroForm = {
  nombre: '',
  correo: '',
  matricula: '',
  rol: 'Alumno',
  contrasena: '',
  confirmacion: '',
};

/** Orden visual de los campos, para enfocar el primero con error. */
const ORDEN_CAMPOS: CampoRegistro[] = ['nombre', 'correo', 'matricula', 'rol', 'contrasena', 'confirmacion'];

type Aviso = { tipo: 'exito' | 'error'; texto: string } | null;

export default function RegisterPage() {
  const [form, setForm] = useState<RegistroForm>(FORM_INICIAL);
  const [errores, setErrores] = useState<ErroresRegistro>({});
  const [tocados, setTocados] = useState<Partial<Record<CampoRegistro, boolean>>>({});
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<Aviso>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const enfocarPrimerError = (errs: ErroresRegistro) => {
    const primero = ORDEN_CAMPOS.find((c) => errs[c]);
    if (primero) formRef.current?.querySelector<HTMLElement>(`[name="${primero}"]`)?.focus();
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const campo = e.target.name as CampoRegistro;
    // La matrícula se guarda en mayúsculas, igual que en el backend.
    const valor = campo === 'matricula' ? e.target.value.toUpperCase() : e.target.value;
    const siguiente = { ...form, [campo]: valor };
    setForm(siguiente);

    // Revalidamos en vivo solo los campos que el usuario ya visitó.
    setErrores((prev) => {
      const nuevos = { ...prev };
      if (tocados[campo]) nuevos[campo] = validarCampo(campo, siguiente);
      if (campo === 'contrasena' && tocados.confirmacion) {
        nuevos.confirmacion = validarCampo('confirmacion', siguiente);
      }
      return nuevos;
    });
  };

  const handleBlur = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const campo = e.target.name as CampoRegistro;
    setTocados((prev) => ({ ...prev, [campo]: true }));
    setErrores((prev) => ({ ...prev, [campo]: validarCampo(campo, form) }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAviso(null);

    const errs = validarRegistro(form);
    setErrores(errs);
    setTocados(Object.fromEntries(ORDEN_CAMPOS.map((c) => [c, true])));
    if (Object.keys(errs).length > 0) {
      setAviso({ tipo: 'error', texto: 'Revisa los campos marcados en rojo.' });
      enfocarPrimerError(errs);
      return;
    }

    setEnviando(true);
    try {
      const usuario = await registrarUsuario({
        nombre: form.nombre.trim(),
        correo: form.correo.trim().toLowerCase(),
        matricula: form.matricula.trim(),
        contrasena: form.contrasena,
        rol: 'Alumno',
      });
      setAviso({
        tipo: 'exito',
        texto: `¡Cuenta creada! ${usuario.nombre}, tu cuenta (${usuario.correo}) fue registrada correctamente.`,
      });
      setForm(FORM_INICIAL);
      setErrores({});
      setTocados({});
    } catch (err) {
      if (err instanceof ApiError) {
        // Errores por campo del servidor (400 VALIDATION_ERROR o 409 CONFLICT).
        const errsServidor: ErroresRegistro = {};
        for (const campo of ORDEN_CAMPOS) {
          if (err.campos[campo]) errsServidor[campo] = err.campos[campo];
        }
        setErrores(errsServidor);
        setAviso({ tipo: 'error', texto: err.message });
        enfocarPrimerError(errsServidor);
      } else {
        setAviso({ tipo: 'error', texto: 'Ocurrió un error inesperado. Intenta de nuevo.' });
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <header className="mb-6 text-center">
          <p className="text-sm font-semibold tracking-wide text-primario">SIAE · ITP</p>
          <h1 className="mt-1 text-2xl font-bold">Crear cuenta</h1>
          <p className="mt-1 text-sm text-slate-600">
            Regístrate con tu correo institucional y tu número de control.
          </p>
        </header>

        <section className="rounded-xl border border-slate-200 bg-superficie p-6 shadow-sm">
          {aviso && (
            <div
              role={aviso.tipo === 'error' ? 'alert' : 'status'}
              className={`mb-5 rounded-lg border px-4 py-3 text-sm ${
                aviso.tipo === 'exito'
                  ? 'border-exito/30 bg-exito/10 text-exito'
                  : 'border-error/30 bg-error/10 text-error'
              }`}
            >
              {aviso.texto}
            </div>
          )}

          <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-4">
            <Campo id="nombre" etiqueta="Nombre completo" error={errores.nombre}>
              <input
                id="nombre"
                name="nombre"
                type="text"
                autoComplete="name"
                maxLength={150}
                value={form.nombre}
                onChange={handleChange}
                onBlur={handleBlur}
                className={claseControl(errores.nombre)}
                {...ariaProps('nombre', errores.nombre)}
              />
            </Campo>

            <Campo
              id="correo"
              etiqueta="Correo institucional"
              error={errores.correo}
              ayuda={`Debe terminar en @${DOMINIO_INSTITUCIONAL}`}
            >
              <input
                id="correo"
                name="correo"
                type="email"
                autoComplete="email"
                placeholder={`l20200000@${DOMINIO_INSTITUCIONAL}`}
                maxLength={150}
                value={form.correo}
                onChange={handleChange}
                onBlur={handleBlur}
                className={claseControl(errores.correo)}
                {...ariaProps('correo', errores.correo, true)}
              />
            </Campo>

            <Campo
              id="matricula"
              etiqueta="Matrícula (número de control)"
              error={errores.matricula}
              ayuda="Obligatoria para alumnos. Solo letras y números."
            >
              <input
                id="matricula"
                name="matricula"
                type="text"
                autoComplete="username"
                maxLength={10}
                value={form.matricula}
                onChange={handleChange}
                onBlur={handleBlur}
                className={claseControl(errores.matricula)}
                {...ariaProps('matricula', errores.matricula, true)}
              />
            </Campo>

            <Campo
              id="rol"
              etiqueta="Rol"
              error={errores.rol}
              ayuda="Las cuentas de Docente, Personal y Administrador las crea un administrador."
            >
              <select
                id="rol"
                name="rol"
                value={form.rol}
                onChange={handleChange}
                onBlur={handleBlur}
                className={claseControl(errores.rol)}
                {...ariaProps('rol', errores.rol, true)}
              >
                <option value="Alumno">Alumno</option>
                <option value="Docente" disabled>Docente (lo asigna un administrador)</option>
                <option value="Personal" disabled>Personal (lo asigna un administrador)</option>
                <option value="Administrador" disabled>Administrador (lo asigna un administrador)</option>
              </select>
            </Campo>

            <Campo id="contrasena" etiqueta="Contraseña" error={errores.contrasena} ayuda="Mínimo 8 caracteres.">
              <input
                id="contrasena"
                name="contrasena"
                type="password"
                autoComplete="new-password"
                maxLength={72}
                value={form.contrasena}
                onChange={handleChange}
                onBlur={handleBlur}
                className={claseControl(errores.contrasena)}
                {...ariaProps('contrasena', errores.contrasena, true)}
              />
            </Campo>

            <Campo id="confirmacion" etiqueta="Confirmar contraseña" error={errores.confirmacion}>
              <input
                id="confirmacion"
                name="confirmacion"
                type="password"
                autoComplete="new-password"
                maxLength={72}
                value={form.confirmacion}
                onChange={handleChange}
                onBlur={handleBlur}
                className={claseControl(errores.confirmacion)}
                {...ariaProps('confirmacion', errores.confirmacion)}
              />
            </Campo>

            <button
              type="submit"
              disabled={enviando}
              className="w-full rounded-lg bg-primario px-4 py-2.5 font-semibold text-white transition hover:bg-primario/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primario focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {enviando ? 'Registrando…' : 'Crear cuenta'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

/* ---- Piezas de presentación reutilizables dentro de este formulario ---- */

function Campo(props: { id: string; etiqueta: string; error?: string; ayuda?: string; children: ReactNode }) {
  const { id, etiqueta, error, ayuda, children } = props;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {etiqueta}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-sm text-error">
          {error}
        </p>
      ) : (
        ayuda && (
          <p id={`${id}-ayuda`} className="mt-1 text-xs text-slate-500">
            {ayuda}
          </p>
        )
      )}
    </div>
  );
}

const claseControl = (error?: string): string =>
  `block w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 ${
    error
      ? 'border-error focus:border-error focus:ring-error/30'
      : 'border-slate-300 focus:border-primario focus:ring-primario/30'
  }`;

/** Enlaza el control con su mensaje para lectores de pantalla. */
const ariaProps = (id: string, error?: string, tieneAyuda = false) => ({
  'aria-invalid': error ? true : undefined,
  'aria-describedby': error ? `${id}-error` : tieneAyuda ? `${id}-ayuda` : undefined,
});
