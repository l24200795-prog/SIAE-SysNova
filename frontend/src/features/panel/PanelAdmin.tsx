/**
 * Panel del Administrador (SCRUM-17): lista de cuentas y alta de usuarios.
 * Es el ÚNICO camino para crear Docente, Personal o Administrador; el registro
 * público solo crea Alumnos. El backend exige rol Administrador (403 si no).
 */
import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import type { Rol, UsuarioDTO } from '../../api/auth';
import { ApiError } from '../../api/client';
import { crearUsuario, listarUsuarios } from '../../api/usuarios';
import {
  AvisoFormulario,
  CLASE_BOTON_PRIMARIO,
  Campo,
  Spinner,
  ariaProps,
  claseControl,
  type Aviso,
} from '../../components/formulario';
import { DOMINIO_INSTITUCIONAL, MATRICULA_LONGITUD, limpiarMatricula } from '../registro/validarRegistro';
import PanelLayout, { InsigniaRol, TarjetaModulo } from './PanelLayout';

interface NuevoUsuarioForm {
  nombre: string;
  correo: string;
  rol: Rol;
  matricula: string;
  contrasena: string;
}
type CampoNuevo = keyof NuevoUsuarioForm;
type Errores = Partial<Record<CampoNuevo, string>>;

const FORM_INICIAL: NuevoUsuarioForm = { nombre: '', correo: '', rol: 'Docente', matricula: '', contrasena: '' };
const ROLES: Rol[] = ['Docente', 'Personal', 'Administrador', 'Alumno'];

const validar = (f: NuevoUsuarioForm): Errores => {
  const e: Errores = {};
  if (!f.nombre.trim()) e.nombre = 'El nombre es obligatorio';
  const correo = f.correo.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) e.correo = 'Escribe un correo válido';
  // El login solo acepta el dominio institucional: otro dominio crearía una cuenta sin acceso.
  else if (!correo.endsWith(`@${DOMINIO_INSTITUCIONAL}`)) e.correo = `Debe ser @${DOMINIO_INSTITUCIONAL}`;
  if (f.rol === 'Alumno' && f.matricula.length !== MATRICULA_LONGITUD) {
    e.matricula = `El número de control debe tener exactamente ${MATRICULA_LONGITUD} dígitos`;
  }
  if (f.contrasena.length < 8) e.contrasena = 'Mínimo 8 caracteres';
  else if (f.contrasena.length > 72) e.contrasena = 'Máximo 72 caracteres';
  return e;
};

export default function PanelAdmin() {
  const [usuarios, setUsuarios] = useState<UsuarioDTO[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorLista, setErrorLista] = useState<string | null>(null);

  const [form, setForm] = useState<NuevoUsuarioForm>(FORM_INICIAL);
  const [errores, setErrores] = useState<Errores>({});
  const [aviso, setAviso] = useState<Aviso>(null);
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorLista(null);
    try {
      setUsuarios(await listarUsuarios());
    } catch (err) {
      setErrorLista(err instanceof ApiError ? err.message : 'No se pudo cargar la lista de usuarios.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const campo = e.target.name as CampoNuevo;
    const valor = campo === 'matricula' ? limpiarMatricula(e.target.value) : e.target.value;
    setForm((prev) => ({ ...prev, [campo]: valor }));
    setErrores((prev) => ({ ...prev, [campo]: undefined }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAviso(null);
    const errs = validar(form);
    setErrores(errs);
    if (Object.keys(errs).length > 0) return;

    setEnviando(true);
    try {
      const creado = await crearUsuario({
        nombre: form.nombre.trim(),
        correo: form.correo.trim().toLowerCase(),
        rol: form.rol,
        matricula: form.rol === 'Alumno' ? form.matricula : null,
        contrasena: form.contrasena,
      });
      setAviso({ tipo: 'exito', texto: `Cuenta creada: ${creado.nombre} (${creado.rol}).` });
      setForm(FORM_INICIAL);
      void cargar();
    } catch (err) {
      if (err instanceof ApiError) {
        const errsServidor: Errores = {};
        for (const c of Object.keys(FORM_INICIAL) as CampoNuevo[]) if (err.campos[c]) errsServidor[c] = err.campos[c];
        setErrores(errsServidor);
        setAviso({ tipo: 'error', texto: err.message });
      } else {
        setAviso({ tipo: 'error', texto: 'Ocurrió un error inesperado. Intenta de nuevo.' });
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <PanelLayout titulo="Panel de administración" descripcion="Gestiona las cuentas y los roles de SIAE.">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* Alta de usuario */}
        <section className="rounded-2xl border border-slate-200/80 bg-superficie p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-texto">Crear usuario</h2>
          <p className="mt-1 mb-5 text-sm text-slate-600">
            Docentes, personal y administradores solo se dan de alta aquí.
          </p>
          <AvisoFormulario aviso={aviso} />
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Campo id="nu-nombre" etiqueta="Nombre completo" error={errores.nombre}>
              <input id="nu-nombre" name="nombre" maxLength={150} value={form.nombre} onChange={handleChange}
                className={claseControl(errores.nombre)} {...ariaProps('nu-nombre', errores.nombre)} />
            </Campo>
            <Campo id="nu-correo" etiqueta="Correo institucional" error={errores.correo}>
              <input id="nu-correo" name="correo" type="email" maxLength={150} value={form.correo} onChange={handleChange}
                autoComplete="off" className={claseControl(errores.correo)} {...ariaProps('nu-correo', errores.correo)} />
            </Campo>
            <Campo id="nu-rol" etiqueta="Rol" error={errores.rol}>
              <select id="nu-rol" name="rol" value={form.rol} onChange={handleChange}
                className={`${claseControl(errores.rol)} cursor-pointer`} {...ariaProps('nu-rol', errores.rol)}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </Campo>
            {form.rol === 'Alumno' && (
              <Campo id="nu-matricula" etiqueta="Número de control" error={errores.matricula}>
                <input id="nu-matricula" name="matricula" inputMode="numeric" maxLength={MATRICULA_LONGITUD}
                  value={form.matricula} onChange={handleChange} placeholder="24200824"
                  className={`${claseControl(errores.matricula)} font-mono tracking-widest`}
                  {...ariaProps('nu-matricula', errores.matricula)} />
              </Campo>
            )}
            <Campo id="nu-contrasena" etiqueta="Contraseña temporal" error={errores.contrasena}
              ayuda="Mínimo 8 caracteres. Compártela por un canal seguro.">
              <input id="nu-contrasena" name="contrasena" type="password" autoComplete="new-password" maxLength={72}
                value={form.contrasena} onChange={handleChange} className={claseControl(errores.contrasena)}
                {...ariaProps('nu-contrasena', errores.contrasena, true)} />
            </Campo>
            <button type="submit" disabled={enviando} className={CLASE_BOTON_PRIMARIO}>
              {enviando && <Spinner />}
              {enviando ? 'Creando…' : 'Crear usuario'}
            </button>
          </form>
        </section>

        {/* Lista de usuarios */}
        <section className="min-w-0 rounded-2xl border border-slate-200/80 bg-superficie shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 px-5 py-4 sm:px-6">
            <h2 className="text-lg font-semibold text-texto">Usuarios</h2>
            <span className="text-sm text-slate-500">{cargando ? 'Cargando…' : `${usuarios.length} mostrados`}</span>
          </div>
          {errorLista ? (
            <p className="px-6 py-8 text-sm text-error" role="alert">{errorLista}</p>
          ) : cargando ? (
            <div className="flex justify-center py-12 text-primario"><Spinner className="h-7 w-7" /></div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {usuarios.map((u) => (
                <li key={u.id_usuario} className="flex items-center justify-between gap-3 px-5 py-3.5 transition hover:bg-fondo sm:px-6">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-texto">
                      {u.nombre}
                      {!u.activo && <span className="ml-2 text-xs font-normal text-error">(inactivo)</span>}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {u.correo}
                      {u.matricula && ` · ${u.matricula}`}
                    </p>
                  </div>
                  <InsigniaRol rol={u.rol} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <TarjetaModulo titulo="Periodos" descripcion="Alta y cambio de estado de periodos escolares." ticket="SCRUM-18" />
        <TarjetaModulo titulo="Parámetros del sistema" descripcion="Límites globales: asistencia mínima, archivos, folios." ticket="SCRUM-25" />
      </div>
    </PanelLayout>
  );
}
