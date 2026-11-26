/**
 * Guardas de navegación. Son solo para la experiencia de usuario: la protección
 * real está en el backend (requireAuth + requireRole), que responde 401/403
 * aunque alguien escriba la URL a mano o llame a la API directamente.
 */
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { Rol } from '../api/auth';
import { Spinner } from '../components/formulario';
import { INICIO_POR_ROL, useSesion } from './SesionContext';

function PantallaCarga() {
  return (
    <div className="flex min-h-screen items-center justify-center text-primario" role="status">
      <Spinner className="h-8 w-8" />
      <span className="sr-only">Cargando…</span>
    </div>
  );
}

/** Solo usuarios con sesión y con uno de los roles indicados. Otro rol → su propio panel. */
export function RutaProtegida({ roles, children }: { roles: Rol[]; children: ReactNode }) {
  const { usuario, cargando } = useSesion();
  const location = useLocation();
  if (cargando) return <PantallaCarga />;
  if (!usuario) return <Navigate to="/login" replace state={{ desde: location.pathname }} />;
  if (!roles.includes(usuario.rol)) return <Navigate to={INICIO_POR_ROL[usuario.rol]} replace />;
  return <>{children}</>;
}

/** Login y registro: si ya hay sesión, se manda al panel del rol. */
export function SoloInvitados({ children }: { children: ReactNode }) {
  const { usuario, cargando } = useSesion();
  if (cargando) return <PantallaCarga />;
  if (usuario) return <Navigate to={INICIO_POR_ROL[usuario.rol]} replace />;
  return <>{children}</>;
}

/** Ruta raíz: decide a dónde ir según la sesión. */
export function RedireccionInicial() {
  const { usuario, cargando } = useSesion();
  if (cargando) return <PantallaCarga />;
  return <Navigate to={usuario ? INICIO_POR_ROL[usuario.rol] : '/login'} replace />;
}
