import RegisterPage from './features/registro/RegisterPage';

// Sin router por ahora: la única pantalla es el registro (SCRUM-11).
// Cuando exista el login (SCRUM-15) se agregará react-router.
export default function App() {
  return <RegisterPage />;
}
