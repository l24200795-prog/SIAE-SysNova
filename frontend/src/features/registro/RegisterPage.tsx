/**
 * Pantalla de registro de cuenta (SCRUM-11 / HU-008D).
 *
 * Flujo:
 *  1. El usuario llena el formulario; cada campo se valida al salir de él (blur).
 *  2. Al enviar, se valida todo. Si hay errores, NO se llama a la API.
 *  3. Si todo está bien, se envía POST /auth/registro.
 *  4. 201 → mensaje de éxito y se limpia el formulario.
 *     400/409 → se muestran los mensajes del servidor debajo de cada campo.
 *
 * Diseño: en escritorio, panel institucional a la izquierda y formulario a la
 * derecha; en tableta y móvil, una sola columna con encabezado compacto.
 */
import { useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { ApiError } from '../../api/client';
import { registrarUsuario } from '../../api/auth';
import {
  DOMINIO_INSTITUCIONAL,
  MATRICULA_LONGITUD,
  limpiarMatricula,
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

const MENSAJE_SOLO_DIGITOS = 'Solo se permiten números: se ignoraron letras, espacios o símbolos.';

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
    // La matrícula solo acepta dígitos (máx. 8): se filtra al escribir o pegar.
    const crudo = e.target.value;
    const valor = campo === 'matricula' ? limpiarMatricula(crudo) : crudo;
    const huboCaracteresInvalidos = campo === 'matricula' && /\D/.test(crudo);
    const siguiente = { ...form, [campo]: valor };
    setForm(siguiente);

    // Revalidamos en vivo solo los campos que el usuario ya visitó.
    setErrores((prev) => {
      const nuevos = { ...prev };
      if (tocados[campo]) nuevos[campo] = validarCampo(campo, siguiente);
      if (huboCaracteresInvalidos) nuevos.matricula = MENSAJE_SOLO_DIGITOS;
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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:px-6 sm:py-12">
      {/* Fondo decorativo sutil */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-32 h-96 w-96 rounded-full bg-primario/15 blur-3xl" />
        <div className="absolute -right-32 -bottom-40 h-96 w-96 rounded-full bg-institucional/15 blur-3xl" />
      </div>

      <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200/80 bg-superficie shadow-xl shadow-slate-900/5 lg:grid-cols-[5fr_7fr]">
        <PanelInstitucional />

        <section className="px-5 py-8 sm:px-10 sm:py-10">
          {/* Encabezado compacto en móvil y tableta */}
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <Logo />
            <div>
              <p className="text-sm font-bold tracking-wide text-institucional">SIAE · ITP</p>
              <p className="text-xs text-slate-500">Instituto Tecnológico de Pachuca</p>
            </div>
          </div>

          <header className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-texto sm:text-3xl">Crear cuenta</h1>
            <p className="mt-1.5 text-sm text-slate-600">
              Regístrate con tu correo institucional y tu número de control.
            </p>
          </header>

          {aviso && (
            <div
              role={aviso.tipo === 'error' ? 'alert' : 'status'}
              className={`mb-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
                aviso.tipo === 'exito'
                  ? 'border-exito/25 bg-exito/10 text-exito'
                  : 'border-error/25 bg-error/10 text-error'
              }`}
            >
              {aviso.tipo === 'exito' ? <IconoCheck /> : <IconoAlerta />}
              <span className="leading-relaxed">{aviso.texto}</span>
            </div>
          )}

          <form ref={formRef} onSubmit={handleSubmit} noValidate className="grid gap-5 sm:grid-cols-2">
            <Campo id="nombre" etiqueta="Nombre completo" error={errores.nombre} className="sm:col-span-2">
              <input
                id="nombre"
                name="nombre"
                type="text"
                autoComplete="name"
                placeholder="Ej. Ana López Hernández"
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
              className="sm:col-span-2"
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
              etiqueta="Número de control"
              error={errores.matricula}
              ayuda={`Exactamente ${MATRICULA_LONGITUD} dígitos, solo números.`}
              extra={
                <span
                  aria-hidden
                  className={`text-xs font-medium tabular-nums ${
                    form.matricula.length === MATRICULA_LONGITUD ? 'text-exito' : 'text-slate-400'
                  }`}
                >
                  {form.matricula.length}/{MATRICULA_LONGITUD}
                </span>
              }
            >
              <input
                id="matricula"
                name="matricula"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="username"
                placeholder="24200824"
                maxLength={MATRICULA_LONGITUD}
                value={form.matricula}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`${claseControl(errores.matricula)} font-mono tracking-widest`}
                {...ariaProps('matricula', errores.matricula, true)}
              />
            </Campo>

            <Campo
              id="rol"
              etiqueta="Rol"
              error={errores.rol}
              ayuda="Otros roles los asigna un administrador."
            >
              <select
                id="rol"
                name="rol"
                value={form.rol}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`${claseControl(errores.rol)} cursor-pointer`}
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

            <div className="pt-1 sm:col-span-2">
              <button
                type="submit"
                disabled={enviando}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primario px-4 font-semibold text-white shadow-md shadow-primario/25 transition duration-200 hover:-translate-y-px hover:bg-institucional hover:shadow-lg hover:shadow-primario/30 focus:outline-none focus-visible:ring-4 focus-visible:ring-primario/30 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:bg-primario"
              >
                {enviando && <Spinner />}
                {enviando ? 'Registrando…' : 'Crear cuenta'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

/* ---- Piezas de presentación reutilizables dentro de este formulario ---- */

function PanelInstitucional() {
  const puntos = [
    'Consulta tu avance de créditos complementarios.',
    'Inscríbete a actividades del periodo vigente.',
    'Descarga tus constancias oficiales.',
  ];
  return (
    <aside className="relative hidden flex-col justify-between overflow-hidden bg-institucional p-10 text-white lg:flex">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_55%)]"
      />
      <div className="relative">
        <div className="flex items-center gap-3">
          <Logo claro />
          <div>
            <p className="text-lg font-bold tracking-wide">SIAE</p>
            <p className="text-xs text-blue-100/80">Instituto Tecnológico de Pachuca</p>
          </div>
        </div>
        <h2 className="mt-12 text-2xl leading-snug font-semibold">
          Sistema de Información e Histórico Digital de Créditos Complementarios
        </h2>
        <ul className="mt-8 space-y-4">
          {puntos.map((p) => (
            <li key={p} className="flex items-start gap-3 text-sm text-blue-50/90">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15">
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3" aria-hidden>
                  <path
                    fillRule="evenodd"
                    d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              {p}
            </li>
          ))}
        </ul>
      </div>
      <p className="relative mt-10 text-xs text-blue-100/70">TecNM · Campus Pachuca</p>
    </aside>
  );
}

function Logo({ claro = false }: { claro?: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex h-11 w-11 items-center justify-center rounded-xl ${
        claro ? 'bg-white/15 text-white ring-1 ring-white/25' : 'bg-institucional text-white'
      }`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 2 8l10 5 10-5-10-5Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 10.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-5.5" />
      </svg>
    </span>
  );
}

function Campo(props: {
  id: string;
  etiqueta: string;
  error?: string;
  ayuda?: string;
  extra?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const { id, etiqueta, error, ayuda, extra, className, children } = props;
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label htmlFor={id} className="block text-sm font-medium text-slate-700">
          {etiqueta}
        </label>
        {extra}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 flex items-start gap-1.5 text-sm text-error">
          <IconoAlerta pequeno />
          <span>{error}</span>
        </p>
      ) : (
        ayuda && (
          <p id={`${id}-ayuda`} className="mt-1.5 text-xs text-slate-500">
            {ayuda}
          </p>
        )
      )}
    </div>
  );
}

function IconoAlerta({ pequeno = false }: { pequeno?: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
      className={`shrink-0 ${pequeno ? 'mt-0.5 h-4 w-4' : 'h-5 w-5'}`}
    >
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function IconoCheck() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className="h-5 w-5 shrink-0">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.86-9.86a.75.75 0 0 0-1.22-.88l-3.24 4.5-1.6-1.6a.75.75 0 1 0-1.06 1.06l2.22 2.22a.75.75 0 0 0 1.14-.09l3.76-5.21Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-5 w-5 animate-spin">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path fill="currentColor" className="opacity-90" d="M4 12a8 8 0 0 1 8-8v3a5 5 0 0 0-5 5H4Z" />
    </svg>
  );
}

const claseControl = (error?: string): string =>
  `block h-11 w-full rounded-lg border bg-white px-3.5 text-sm text-texto shadow-sm transition duration-150 placeholder:text-slate-400 focus:outline-none focus:ring-4 ${
    error
      ? 'border-error bg-error/5 focus:border-error focus:ring-error/15'
      : 'border-slate-300 hover:border-slate-400 focus:border-primario focus:ring-primario/15'
  }`;

/** Enlaza el control con su mensaje para lectores de pantalla. */
const ariaProps = (id: string, error?: string, tieneAyuda = false) => ({
  'aria-invalid': error ? true : undefined,
  'aria-describedby': error ? `${id}-error` : tieneAyuda ? `${id}-ayuda` : undefined,
});
