/**
 * Marco de los paneles con sesión iniciada: barra superior con la identidad
 * del usuario, su rol y el botón para cerrar sesión.
 */
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Rol } from '../../api/auth';
import { useSesion } from '../../auth/SesionContext';
import { Logo, Spinner } from '../../components/formulario';

const COLOR_ROL: Record<Rol, string> = {
  Administrador: 'bg-institucional/10 text-institucional ring-institucional/20',
  Personal: 'bg-amber-100 text-amber-800 ring-amber-600/20',
  Docente: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20',
  Alumno: 'bg-primario/10 text-primario ring-primario/20',
};

export function InsigniaRol({ rol }: { rol: Rol }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${COLOR_ROL[rol]}`}>
      {rol}
    </span>
  );
}

export default function PanelLayout(props: { titulo: string; descripcion: string; children: ReactNode }) {
  const { titulo, descripcion, children } = props;
  const { usuario, cerrarSesion } = useSesion();
  const navigate = useNavigate();
  const [saliendo, setSaliendo] = useState(false);

  const salir = async () => {
    setSaliendo(true);
    await cerrarSesion();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-superficie/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Logo />
            <div className="min-w-0">
              <p className="text-sm font-bold tracking-wide text-institucional">SIAE · ITP</p>
              <p className="hidden truncate text-xs text-slate-500 sm:block">Instituto Tecnológico de Pachuca</p>
            </div>
          </div>
          {usuario && (
            <div className="flex items-center gap-3">
              <div className="hidden min-w-0 text-right md:block">
                <p className="truncate text-sm font-medium text-texto">{usuario.nombre}</p>
                <p className="truncate text-xs text-slate-500">{usuario.correo}</p>
              </div>
              <InsigniaRol rol={usuario.rol} />
              <button
                type="button"
                onClick={salir}
                disabled={saliendo}
                className="flex h-9 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:border-error/40 hover:bg-error/5 hover:text-error focus:outline-none focus-visible:ring-4 focus-visible:ring-primario/20 disabled:opacity-60"
              >
                {saliendo && <Spinner className="h-4 w-4" />}
                Salir
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="animate-aparecer mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-texto sm:text-3xl">{titulo}</h1>
          <p className="mt-1.5 text-sm text-slate-600">{descripcion}</p>
        </div>
        {children}
      </main>
    </div>
  );
}

/** Tarjeta de un módulo que todavía no está construido. */
export function TarjetaModulo({ titulo, descripcion, ticket }: { titulo: string; descripcion: string; ticket: string }) {
  return (
    <article className="group rounded-2xl border border-slate-200/80 bg-superficie p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primario/30 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-semibold text-texto transition group-hover:text-primario">{titulo}</h2>
        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
          Próximamente
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-600">{descripcion}</p>
      <p className="mt-4 text-xs text-slate-400">{ticket}</p>
    </article>
  );
}
