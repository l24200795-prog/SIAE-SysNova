/**
 * Pantalla de inicio de sesión (SCRUM-15 / HU-008A).
 *
 * Flujo:
 *  1. Correo institucional o usuario (parte antes de la @) + contraseña.
 *  2. POST /auth/login → el backend compara con el hash BCrypt y responde con
 *     la sesión; el JWT queda en una cookie HttpOnly.
 *  3. Se redirige al panel del rol (Administrador, Alumno, Docente, Personal).
 *  Errores: 404 cuenta no registrada · 401 contraseña incorrecta ·
 *           403 cuenta desactivada · 429 bloqueo por intentos fallidos.
 *
 * "¿Olvidaste tu contraseña?" lleva a /recuperar-contrasena (SCRUM-16). Por
 * ahora esa pantalla es solo interfaz: el envío por SMTP aún no existe.
 */
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../../api/client';
import { INICIO_POR_ROL, useSesion } from '../../auth/SesionContext';
import AuthLayout from '../../components/AuthLayout';
import {
  AvisoFormulario,
  CLASE_BOTON_PRIMARIO,
  Campo,
  Spinner,
  ariaProps,
  claseControl,
  type Aviso,
} from '../../components/formulario';
import { DOMINIO_INSTITUCIONAL } from '../registro/validarRegistro';
import { aCorreo, validarCampoLogin, validarLogin, type CampoLogin, type ErroresLogin, type LoginForm } from './validarLogin';

const FORM_INICIAL: LoginForm = { identificador: '', contrasena: '' };
const ORDEN_CAMPOS: CampoLogin[] = ['identificador', 'contrasena'];

export default function LoginPage() {
  const { iniciarSesion } = useSesion();
  const navigate = useNavigate();
  const [form, setForm] = useState<LoginForm>(FORM_INICIAL);
  const [errores, setErrores] = useState<ErroresLogin>({});
  const [tocados, setTocados] = useState<Partial<Record<CampoLogin, boolean>>>({});
  const [verContrasena, setVerContrasena] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<Aviso>(null);
  const [noRegistrado, setNoRegistrado] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const enfocar = (campo?: CampoLogin) => {
    if (campo) formRef.current?.querySelector<HTMLElement>(`[name="${campo}"]`)?.focus();
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const campo = e.target.name as CampoLogin;
    const siguiente = { ...form, [campo]: e.target.value };
    setForm(siguiente);
    if (tocados[campo]) setErrores((prev) => ({ ...prev, [campo]: validarCampoLogin(campo, siguiente) }));
  };

  const handleBlur = (e: ChangeEvent<HTMLInputElement>) => {
    const campo = e.target.name as CampoLogin;
    setTocados((prev) => ({ ...prev, [campo]: true }));
    setErrores((prev) => ({ ...prev, [campo]: validarCampoLogin(campo, form) }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAviso(null);
    setNoRegistrado(false);

    const errs = validarLogin(form);
    setErrores(errs);
    setTocados({ identificador: true, contrasena: true });
    if (Object.keys(errs).length > 0) {
      enfocar(ORDEN_CAMPOS.find((c) => errs[c]));
      return;
    }

    setEnviando(true);
    try {
      const usuario = await iniciarSesion({ correo: aCorreo(form.identificador), contrasena: form.contrasena });
      navigate(INICIO_POR_ROL[usuario.rol], { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        // El backend nombra el campo "correo"; en pantalla es "identificador".
        const errsServidor: ErroresLogin = {};
        // 404 (no registrado) ya se explica en el aviso con el enlace a registro.
        if (err.campos.correo && err.status !== 404) errsServidor.identificador = err.campos.correo;
        if (err.campos.contrasena) errsServidor.contrasena = err.campos.contrasena;
        setErrores(errsServidor);
        setNoRegistrado(err.status === 404);
        setAviso({ tipo: 'error', texto: err.message });
        enfocar(ORDEN_CAMPOS.find((c) => errsServidor[c]));
      } else {
        setAviso({ tipo: 'error', texto: 'Ocurrió un error inesperado. Intenta de nuevo.' });
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <AuthLayout
      ancho="normal"
      titulo="Iniciar sesión"
      subtitulo="Accede con tu correo institucional o tu usuario."
    >
      <AvisoFormulario aviso={aviso}>
        {noRegistrado && (
          <>
            {' '}
            <Link to="/registro" className="font-semibold underline underline-offset-2 hover:no-underline">
              Crear una cuenta
            </Link>
          </>
        )}
      </AvisoFormulario>

      <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-5">
        <Campo
          id="identificador"
          etiqueta="Correo institucional o usuario"
          error={errores.identificador}
          ayuda={`Ej. l24200824@${DOMINIO_INSTITUCIONAL} o solo l24200824`}
        >
          <input
            id="identificador"
            name="identificador"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder={`usuario o correo @${DOMINIO_INSTITUCIONAL}`}
            maxLength={150}
            value={form.identificador}
            onChange={handleChange}
            onBlur={handleBlur}
            className={claseControl(errores.identificador)}
            {...ariaProps('identificador', errores.identificador, true)}
          />
        </Campo>

        <Campo
          id="contrasena"
          etiqueta="Contraseña"
          error={errores.contrasena}
          extra={
            <Link
              to="/recuperar-contrasena"
              className="text-sm font-medium text-primario underline-offset-4 transition hover:text-institucional hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          }
        >
          <div className="relative">
            <input
              id="contrasena"
              name="contrasena"
              type={verContrasena ? 'text' : 'password'}
              autoComplete="current-password"
              maxLength={72}
              value={form.contrasena}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`${claseControl(errores.contrasena)} pr-12`}
              {...ariaProps('contrasena', errores.contrasena)}
            />
            <button
              type="button"
              onClick={() => setVerContrasena((v) => !v)}
              aria-label={verContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              aria-pressed={verContrasena}
              aria-controls="contrasena"
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-slate-500 transition hover:text-primario focus:outline-none focus-visible:text-primario focus-visible:ring-2 focus-visible:ring-primario/40"
            >
              <IconoOjo tachado={verContrasena} />
            </button>
          </div>
        </Campo>

        <div className="pt-1">
          <button type="submit" disabled={enviando} className={CLASE_BOTON_PRIMARIO}>
            {enviando && <Spinner />}
            {enviando ? 'Verificando…' : 'Iniciar sesión'}
          </button>
          <p className="mt-5 text-center text-sm text-slate-600">
            ¿No tienes cuenta?{' '}
            <Link
              to="/registro"
              className="font-semibold text-primario underline-offset-4 transition hover:text-institucional hover:underline"
            >
              Regístrate
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}

function IconoOjo({ tachado }: { tachado: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden className="h-5 w-5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.04 12.32a1 1 0 0 1 0-.64C3.42 7.51 7.36 4.5 12 4.5s8.57 3 9.96 7.18a1 1 0 0 1 0 .64C20.58 16.49 16.64 19.5 12 19.5s-8.57-3-9.96-7.18Z"
      />
      <circle cx="12" cy="12" r="3" />
      {tachado && <path strokeLinecap="round" d="M4 4l16 16" />}
    </svg>
  );
}
