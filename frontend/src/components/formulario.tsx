/**
 * Piezas de formulario compartidas por Registro, Login y los paneles.
 * Mantienen un solo estilo de campos, mensajes y botones en todo SIAE.
 */
import type { ReactNode } from 'react';

export function Campo(props: {
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

export const claseControl = (error?: string): string =>
  `block h-11 w-full rounded-lg border bg-white px-3.5 text-sm text-texto shadow-sm transition duration-150 placeholder:text-slate-400 focus:outline-none focus:ring-4 ${
    error
      ? 'border-error bg-error/5 focus:border-error focus:ring-error/15'
      : 'border-slate-300 hover:border-slate-400 focus:border-primario focus:ring-primario/15'
  }`;

/** Enlaza el control con su mensaje para lectores de pantalla. */
export const ariaProps = (id: string, error?: string, tieneAyuda = false) => ({
  'aria-invalid': error ? true : undefined,
  'aria-describedby': error ? `${id}-error` : tieneAyuda ? `${id}-ayuda` : undefined,
});

export const CLASE_BOTON_PRIMARIO =
  'flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primario px-4 font-semibold text-white shadow-md shadow-primario/25 transition duration-200 hover:-translate-y-px hover:bg-institucional hover:shadow-lg hover:shadow-primario/30 focus:outline-none focus-visible:ring-4 focus-visible:ring-primario/30 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:bg-primario';

export type Aviso = { tipo: 'exito' | 'error'; texto: string } | null;

/** Mensaje general arriba del formulario (éxito o error). */
export function AvisoFormulario({ aviso, children }: { aviso: Aviso; children?: ReactNode }) {
  if (!aviso) return null;
  return (
    <div
      role={aviso.tipo === 'error' ? 'alert' : 'status'}
      className={`animate-aparecer mb-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
        aviso.tipo === 'exito'
          ? 'border-exito/25 bg-exito/10 text-exito'
          : 'border-error/25 bg-error/10 text-error'
      }`}
    >
      {aviso.tipo === 'exito' ? <IconoCheck /> : <IconoAlerta />}
      <div className="leading-relaxed">
        {aviso.texto}
        {children}
      </div>
    </div>
  );
}

export function IconoAlerta({ pequeno = false }: { pequeno?: boolean }) {
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

export function IconoCheck() {
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

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={`${className} animate-spin`}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path fill="currentColor" className="opacity-90" d="M4 12a8 8 0 0 1 8-8v3a5 5 0 0 0-5 5H4Z" />
    </svg>
  );
}

export function Logo({ claro = false }: { claro?: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
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
