/**
 * Paneles provisionales de Alumno, Docente y Personal. Muestran los módulos
 * que llegarán en sus tickets; no inventan datos.
 */
import { useSesion } from '../../auth/SesionContext';
import PanelLayout, { TarjetaModulo } from './PanelLayout';

type Modulo = { titulo: string; descripcion: string; ticket: string };

function Panel({ titulo, descripcion, modulos }: { titulo: string; descripcion: string; modulos: Modulo[] }) {
  return (
    <PanelLayout titulo={titulo} descripcion={descripcion}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modulos.map((m) => (
          <TarjetaModulo key={m.titulo} {...m} />
        ))}
      </div>
    </PanelLayout>
  );
}

const primerNombre = (nombre?: string) => nombre?.split(' ')[0] ?? '';

export function PanelAlumno() {
  const { usuario } = useSesion();
  return (
    <Panel
      titulo={`Hola, ${primerNombre(usuario?.nombre)}`}
      descripcion={`Número de control ${usuario?.matricula ?? '—'} · Panel del alumno`}
      modulos={[
        { titulo: 'Mis créditos', descripcion: 'Consulta tu avance y créditos complementarios acreditados.', ticket: 'SCRUM-32' },
        { titulo: 'Catálogo de actividades', descripcion: 'Talleres disponibles en el periodo vigente.', ticket: 'SCRUM-24' },
        { titulo: 'Mis inscripciones', descripcion: 'Inscríbete o date de baja de una actividad.', ticket: 'SCRUM-30 / 31' },
      ]}
    />
  );
}

export function PanelDocente() {
  const { usuario } = useSesion();
  return (
    <Panel
      titulo={`Hola, ${primerNombre(usuario?.nombre)}`}
      descripcion="Panel del docente"
      modulos={[
        { titulo: 'Mis talleres', descripcion: 'Actividades donde eres responsable y su lista de inscritos.', ticket: 'SCRUM-28' },
        { titulo: 'Captura de avance', descripcion: 'Registra asistencia y evidencias de tus grupos.', ticket: 'SCRUM-34' },
        { titulo: 'Materiales', descripcion: 'Comparte archivos con los alumnos de tus talleres.', ticket: 'SCRUM-33' },
      ]}
    />
  );
}

export function PanelPersonal() {
  const { usuario } = useSesion();
  return (
    <Panel
      titulo={`Hola, ${primerNombre(usuario?.nombre)}`}
      descripcion="Panel del personal de Actividades Extraescolares"
      modulos={[
        { titulo: 'Expedientes', descripcion: 'Busca el expediente de un alumno por número de control.', ticket: 'SCRUM-27' },
        { titulo: 'Evaluación oficial', descripcion: 'Evalúa inscripciones y acredita créditos.', ticket: 'SCRUM-35' },
        { titulo: 'Constancias', descripcion: 'Genera constancias con folio y código QR.', ticket: 'SCRUM-37' },
        { titulo: 'Actividades y aulas', descripcion: 'Administra talleres y el catálogo de aulas.', ticket: 'SCRUM-19 / 24' },
      ]}
    />
  );
}
