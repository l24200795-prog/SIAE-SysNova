/**
 * Recuperación de contraseña · paso 1: solicitar con el correo institucional
 * (SCRUM-16 / HU-008B).
 *
 * Estado actual: solo interfaz. El envío de correo, el código de verificación
 * y SMTP los desarrollará otro integrante del equipo. Por eso, al continuar,
 * NO se llama a la API ni se afirma que se envió algo: se explica que el
 * código llegará al correo institucional en una próxima actualización.
 *
 * Para conectarlo cuando exista POST /auth/recuperar:
 *  1. Cambiar RECUPERACION_DISPONIBLE a true.
 *  2. solicitarRecuperacion() (api/auth.ts) ya envía { correo } según
 *     solicitarRecuperacionSchema del contrato.
 *  3. Ajustar el texto de la pantalla de confirmación y, si aplica, navegar
 *     a la pantalla donde se escriba el código de verificación.
 */
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { solicitarRecuperacion } from '../../api/auth';
import { ApiError } from '../../api/client';
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
import { aCorreo, validarCampoLogin } from '../login/validarLogin';
import { DOMINIO_INSTITUCIONAL } from '../registro/validarRegistro';

/** false mientras no exista el envío de correos en el backend. */
const RECUPERACION_DISPONIBLE = false;

const CLASE_ENLACE =
  'font-semibold text-primario underline-offset-4 transition hover:text-institucional hover:underline';

/** Mismo criterio que el login: correo @pachuca.tecnm.mx o solo el usuario. */
const validarCorreo = (valor: string) => validarCampoLogin('identificador', { identificador: valor, contrasena: '' });

export default function RecuperarContrasenaPage() {
  const [identificador, setIdentificador] = useState('');
  const [error, setError] = useState<string>();
  const [tocado, setTocado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<Aviso>(null);
  /** Correo ya normalizado que se mostró en la confirmación. */
  const [correoSolicitado, setCorreoSolicitado] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setIdentificador(e.target.value);
    if (tocado) setError(validarCorreo(e.target.value));
  };

  const handleBlur = () => {
    setTocado(true);
    setError(validarCorreo(identificador));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAviso(null);
    setTocado(true);

    const err = validarCorreo(identificador);
    setError(err);
    if (err) {
      inputRef.current?.focus();
      return;
    }

    const correo = aCorreo(identificador);
    if (!RECUPERACION_DISPONIBLE) {
      setCorreoSolicitado(correo);
      return;
    }

    setEnviando(true);
    try {
      await solicitarRecuperacion({ correo });
      setCorreoSolicitado(correo);
    } catch (errApi) {
      if (errApi instanceof ApiError) {
        if (errApi.campos.correo) setError(errApi.campos.correo);
        setAviso({ tipo: 'error', texto: errApi.message });
      } else {
        setAviso({ tipo: 'error', texto: 'Ocurrió un error inesperado. Intenta de nuevo.' });
      }
    } finally {
      setEnviando(false);
    }
  };

  const usarOtroCorreo = () => {
    setCorreoSolicitado(null);
    setTocado(false);
    setError(undefined);
  };

  if (correoSolicitado) {
    return (
      <AuthLayout
        ancho="normal"
        titulo="Recuperar contraseña"
        subtitulo="Esta función estará disponible próximamente."
      >
        <div
          role="status"
          className="animate-aparecer mb-6 flex items-start gap-3 rounded-xl border border-primario/25 bg-primario/10 px-4 py-3 text-sm text-institucional"
        >
          <IconoInfo />
          <div className="space-y-2 leading-relaxed">
            <p>
              La recuperación de contraseña aún está en desarrollo.{' '}
              <strong className="font-semibold">Todavía no se envió ningún correo.</strong>
            </p>
            <p>
              En una próxima actualización recibirás un código de verificación en tu correo institucional{' '}
              <span className="font-semibold break-all">{correoSolicitado}</span> para restablecer tu contraseña.
            </p>
          </div>
        </div>

        <Link to="/login" className={CLASE_BOTON_PRIMARIO}>
          Volver a iniciar sesión
        </Link>
        <p className="mt-5 text-center text-sm text-slate-600">
          ¿Te equivocaste de correo?{' '}
          <button type="button" onClick={usarOtroCorreo} className={CLASE_ENLACE}>
            Usar otro correo
          </button>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      ancho="normal"
      titulo="Recuperar contraseña"
      subtitulo="Escribe tu correo institucional para recuperar el acceso a tu cuenta."
    >
      <AvisoFormulario aviso={aviso} />

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Campo
          id="correo"
          etiqueta="Correo institucional"
          error={error}
          ayuda={`Ej. l24200824@${DOMINIO_INSTITUCIONAL} o solo l24200824`}
        >
          <input
            ref={inputRef}
            id="correo"
            name="correo"
            type="text"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
            placeholder={`usuario@${DOMINIO_INSTITUCIONAL}`}
            maxLength={150}
            value={identificador}
            onChange={handleChange}
            onBlur={handleBlur}
            className={claseControl(error)}
            {...ariaProps('correo', error, true)}
          />
        </Campo>

        <div className="pt-1">
          <button type="submit" disabled={enviando} className={CLASE_BOTON_PRIMARIO}>
            {enviando && <Spinner />}
            {enviando ? 'Enviando…' : 'Recuperar contraseña'}
          </button>
          <p className="mt-5 text-center text-sm text-slate-600">
            ¿Recordaste tu contraseña?{' '}
            <Link to="/login" className={CLASE_ENLACE}>
              Inicia sesión
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}

function IconoInfo() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className="h-5 w-5 shrink-0">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.25v3.25a.75.75 0 0 0 1.5 0V9.75A.75.75 0 0 0 10 9H9Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
