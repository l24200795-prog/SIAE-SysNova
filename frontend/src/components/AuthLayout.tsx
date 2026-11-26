/**
 * Marco visual de las pantallas públicas (Registro e Inicio de sesión).
 * Escritorio: panel institucional a la izquierda + contenido a la derecha.
 * Tableta y móvil: una sola columna con encabezado compacto.
 */
import type { ReactNode } from 'react';
import { Logo } from './formulario';

export default function AuthLayout(props: {
  titulo: string;
  subtitulo: string;
  /** Ancho máximo de la tarjeta: el registro usa más columnas que el login. */
  ancho?: 'normal' | 'amplio';
  children: ReactNode;
}) {
  const { titulo, subtitulo, ancho = 'amplio', children } = props;
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:px-6 sm:py-12">
      {/* Fondo decorativo sutil */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-32 h-96 w-96 rounded-full bg-primario/15 blur-3xl" />
        <div className="absolute -right-32 -bottom-40 h-96 w-96 rounded-full bg-institucional/15 blur-3xl" />
      </div>

      <div
        className={`animate-aparecer grid w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-superficie shadow-xl shadow-slate-900/5 ${
          ancho === 'amplio' ? 'max-w-5xl lg:grid-cols-[5fr_7fr]' : 'max-w-4xl lg:grid-cols-[1fr_1fr]'
        }`}
      >
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
            <h1 className="text-2xl font-bold tracking-tight text-texto sm:text-3xl">{titulo}</h1>
            <p className="mt-1.5 text-sm text-slate-600">{subtitulo}</p>
          </header>

          {children}
        </section>
      </div>
    </main>
  );
}

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
