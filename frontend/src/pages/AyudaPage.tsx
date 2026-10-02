import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Building2, FileStack, Inbox, KeyRound, Layers, Lightbulb } from 'lucide-react';
import { Card, PageHeader } from '@/components/ui/Display';
import { useAuth } from '@/context/AuthContext';

interface Guia {
  icono: ReactNode;
  titulo: string;
  /** Solo la ven las jefaturas */
  admin: boolean;
  pasos: ReactNode[];
  consejo?: ReactNode;
}

const enlace = 'font-medium text-brand-700 hover:underline';

const guias: Guia[] = [
  {
    icono: <Building2 className="size-5" />,
    titulo: 'Crear un proyecto y asignarle personal',
    admin: true,
    pasos: [
      <>Si el cliente es nuevo, regístralo primero en <Link to="/clientes" className={enlace}>Clientes</Link>.</>,
      <>En <Link to="/proyectos" className={enlace}>Proyectos</Link>, pulsa <b>Nuevo proyecto</b> y completa el cliente, el tipo de servicio, las fechas y el monto del contrato.</>,
      <>Entra al proyecto, abre la pestaña <b>Equipo y horas</b> y pulsa <b>Asignar</b> para elegir a los profesionales que trabajarán en él.</>,
      <>Desde esa misma pestaña se registran las horas trabajadas de cada profesional.</>,
    ],
    consejo: <>Los profesionales se registran antes en <Link to="/trabajadores" className={enlace}>Personal y tarifas</Link>, con su costo por hora.</>,
  },
  {
    icono: <KeyRound className="size-5" />,
    titulo: 'Dar acceso a un arquitecto o ingeniero',
    admin: true,
    pasos: [
      <>En <Link to="/usuarios" className={enlace}>Accesos a la intranet</Link>, pulsa <b>Nuevo usuario</b>.</>,
      <>Escribe su nombre, correo y una contraseña inicial, y elige el rol <b>Arquitecto o ingeniero</b>.</>,
      <>Entra al proyecto, abre la pestaña <b>Ajustes</b> y en <b>Usuarios con acceso</b> agrégalo. Solo verá los proyectos donde lo agregues.</>,
      <>Envíale su correo y su contraseña para que inicie sesión.</>,
    ],
    consejo: <>Si alguien deja la empresa, desactiva su acceso: no se borra nada de lo que subió.</>,
  },
  {
    icono: <FileStack className="size-5" />,
    titulo: 'Subir, aprobar u observar un plano',
    admin: false,
    pasos: [
      <>En el proyecto, abre la pestaña <b>Planos</b> y pulsa <b>Nuevo plano</b>: código de lámina (ej. A-01), título, especialidad y el archivo.</>,
      <>Al subir el archivo, el plano queda <b>En revisión</b> y aparece en el Resumen general de las jefaturas.</>,
      <>La jefatura pulsa <b>Aprobar</b>, o <b>Observar</b> y escribe qué hay que corregir.</>,
      <>Para corregir un plano observado, usa <b>Subir nueva revisión</b>: queda guardado como Rev. B, C… y vuelve a revisión. Las versiones anteriores no se pierden.</>,
    ],
  },
  {
    icono: <Layers className="size-5" />,
    titulo: 'Publicar o editar un servicio en la página web',
    admin: true,
    pasos: [
      <>Abre <Link to="/servicios" className={enlace}>Servicios</Link>. La lista aparece en la web en ese mismo orden; cámbialo con las flechas.</>,
      <>Pulsa el lápiz para editar el nombre, la descripción o lo que incluye el servicio (un punto por línea).</>,
      <>Si eliges una foto (JPG, PNG o WEBP), la web la muestra en lugar del ícono.</>,
      <>Para quitar un servicio de la web, pulsa el ojo tachado (<b>Ocultar</b>). Puedes volver a mostrarlo cuando quieras.</>,
    ],
    consejo: <>Los cambios se ven en la web al recargar la página.</>,
  },
  {
    icono: <Inbox className="size-5" />,
    titulo: 'Leer y responder los mensajes de la web',
    admin: true,
    pasos: [
      <>En el menú, <Link to="/mensajes" className={enlace}>Mensajes</Link> muestra cuántos mensajes hay sin leer.</>,
      <>Haz clic en un mensaje para ver el detalle: queda marcado como leído.</>,
      <>Pulsa <b>Responder por correo</b> para escribirle a la persona desde tu correo.</>,
      <>Usa el filtro <b>Consulta técnica</b> para ver solo las consultas técnicas.</>,
    ],
  },
];

export default function AyudaPage() {
  const { esAdmin } = useAuth();
  const visibles = guias.filter((g) => esAdmin || !g.admin);

  return (
    <>
      <PageHeader title="Ayuda" subtitle="Guías cortas para las tareas más comunes de la intranet." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {visibles.map((g) => (
          <Card key={g.titulo} className="p-5">
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
              <span className="flex size-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">{g.icono}</span>
              {g.titulo}
            </h2>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700 marker:font-semibold marker:text-slate-400">
              {g.pasos.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ol>
            {g.consejo && (
              <p className="mt-4 flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-brand-600" />
                <span>{g.consejo}</span>
              </p>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
