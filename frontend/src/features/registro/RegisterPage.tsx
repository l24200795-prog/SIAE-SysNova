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
 * Diseño: AuthLayout + piezas de components/formulario (compartidas con Login).
 */
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../../api/client';
import { registrarUsuario } from '../../api/auth';
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
    <AuthLayout titulo="Crear cuenta" subtitulo="Regístrate con tu correo institucional y tu número de control.">
      <AvisoFormulario aviso={aviso}>
        {aviso?.tipo === 'exito' && (
          <>
            {' '}
            <Link to="/login" className="font-semibold underline underline-offset-2 hover:no-underline">
              Inicia sesión
            </Link>
          </>
        )}
      </AvisoFormulario>

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
          <button type="submit" disabled={enviando} className={CLASE_BOTON_PRIMARIO}>
            {enviando && <Spinner />}
            {enviando ? 'Registrando…' : 'Crear cuenta'}
          </button>
          <p className="mt-5 text-center text-sm text-slate-600">
            ¿Ya tienes cuenta?{' '}
            <Link
              to="/login"
              className="font-semibold text-primario underline-offset-4 transition hover:text-institucional hover:underline"
            >
              Inicia sesión
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}
