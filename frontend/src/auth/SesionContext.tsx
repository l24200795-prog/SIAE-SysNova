/**
 * Estado de sesión de la SPA (SCRUM-15).
 *
 * El JWT vive en una cookie HttpOnly: el navegador lo envía solo y JavaScript
 * NO puede leerlo. Por eso, al cargar la app se pregunta al backend quién es el
 * usuario (GET /auth/me). Aquí solo se guarda la copia de UsuarioDTO para
 * pintar la interfaz; la autoridad final siempre es el backend (RBAC → 401/403).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  cerrarSesion as cerrarSesionApi,
  iniciarSesion as iniciarSesionApi,
  obtenerSesion,
  type LoginRequest,
  type Rol,
  type UsuarioDTO,
} from '../api/auth';

/** Página principal de cada rol. */
export const INICIO_POR_ROL: Record<Rol, string> = {
  Administrador: '/admin',
  Alumno: '/alumno',
  Docente: '/docente',
  Personal: '/personal',
};

interface SesionContextValue {
  usuario: UsuarioDTO | null;
  /** true mientras se consulta /auth/me al abrir la app. */
  cargando: boolean;
  iniciarSesion: (datos: LoginRequest) => Promise<UsuarioDTO>;
  cerrarSesion: () => Promise<void>;
}

const SesionContext = createContext<SesionContextValue | null>(null);

export function SesionProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioDTO | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vigente = true;
    obtenerSesion()
      .then((s) => vigente && setUsuario(s.usuario))
      .catch(() => vigente && setUsuario(null)) // 401 = sin sesión
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, []);

  const iniciarSesion = useCallback(async (datos: LoginRequest) => {
    const sesion = await iniciarSesionApi(datos);
    setUsuario(sesion.usuario);
    return sesion.usuario;
  }, []);

  const cerrarSesion = useCallback(async () => {
    try {
      await cerrarSesionApi();
    } finally {
      setUsuario(null);
    }
  }, []);

  const valor = useMemo(
    () => ({ usuario, cargando, iniciarSesion, cerrarSesion }),
    [usuario, cargando, iniciarSesion, cerrarSesion],
  );
  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

export function useSesion(): SesionContextValue {
  const ctx = useContext(SesionContext);
  if (!ctx) throw new Error('useSesion debe usarse dentro de <SesionProvider>');
  return ctx;
}
