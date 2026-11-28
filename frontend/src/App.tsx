import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { RedireccionInicial, RutaProtegida, SoloInvitados } from './auth/RutaProtegida';
import { SesionProvider } from './auth/SesionContext';
import LoginPage from './features/login/LoginPage';
import RecuperarContrasenaPage from './features/recuperacion/RecuperarContrasenaPage';
import PanelAdmin from './features/panel/PanelAdmin';
import { PanelAlumno, PanelDocente, PanelPersonal } from './features/panel/PanelesRol';
import RegisterPage from './features/registro/RegisterPage';

/**
 * Rutas de la SPA. Cada panel solo se muestra al rol indicado; si otro rol
 * entra por URL se le regresa a su propio panel. La API aplica el mismo RBAC.
 */
export default function App() {
  return (
    <SesionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RedireccionInicial />} />
          <Route path="/login" element={<SoloInvitados><LoginPage /></SoloInvitados>} />
          <Route path="/registro" element={<SoloInvitados><RegisterPage /></SoloInvitados>} />
          <Route path="/recuperar-contrasena" element={<SoloInvitados><RecuperarContrasenaPage /></SoloInvitados>} />

          <Route path="/admin" element={<RutaProtegida roles={['Administrador']}><PanelAdmin /></RutaProtegida>} />
          <Route path="/alumno" element={<RutaProtegida roles={['Alumno']}><PanelAlumno /></RutaProtegida>} />
          <Route path="/docente" element={<RutaProtegida roles={['Docente']}><PanelDocente /></RutaProtegida>} />
          <Route path="/personal" element={<RutaProtegida roles={['Personal']}><PanelPersonal /></RutaProtegida>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </SesionProvider>
  );
}
