import { lazy } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router';
import { useAuth } from '@/context/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Spinner } from '@/components/ui/Display';
import LoginPage from '@/pages/LoginPage';

// Páginas cargadas bajo demanda (el login abre rápido; Recharts solo se descarga al ver gráficos)
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const MiTrabajoPage = lazy(() => import('@/pages/MiTrabajoPage'));
const ProyectosPage = lazy(() => import('@/pages/ProyectosPage'));
const ProyectoPage = lazy(() => import('@/pages/proyecto/ProyectoPage'));
const UsuariosPage = lazy(() => import('@/pages/UsuariosPage'));
const ClientesPage = lazy(() => import('@/pages/ClientesPage'));
const TrabajadoresPage = lazy(() => import('@/pages/TrabajadoresPage'));
const ServiciosPage = lazy(() => import('@/pages/ServiciosPage'));
const MensajesPage = lazy(() => import('@/pages/MensajesPage'));
const AuditoriaPage = lazy(() => import('@/pages/AuditoriaPage'));
const DocumentosPage = lazy(() => import('@/pages/DocumentosPage'));
const AyudaPage = lazy(() => import('@/pages/AyudaPage'));
const SitioPage = lazy(() => import('@/pages/SitioPage'));
const PortafolioPage = lazy(() => import('@/pages/PortafolioPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
const CmsPage = lazy(() => import('@/pages/CmsPage'));
const MediosPage = lazy(() => import('@/pages/MediosPage'));
const GastosEmpresaPage = lazy(() => import('@/pages/GastosEmpresaPage'));

function RequireEditor() {
  const { puedeEditarWeb } = useAuth();
  return puedeEditarWeb ? <Outlet /> : <Navigate to="/" replace />;
}

/** Exige sesión iniciada */
function RequireAuth() {
  const { usuario, cargando } = useAuth();
  const location = useLocation();
  if (cargando) return <Spinner label="Verificando sesión…" className="h-full" />;
  if (!usuario) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

/** Solo ADMIN; el USUARIO va a sus proyectos */
function RequireAdmin() {
  const { esAdmin } = useAuth();
  return esAdmin ? <Outlet /> : <Navigate to="/" replace />;
}

function InicioRoute() {
  const { esAdmin } = useAuth();
  return esAdmin ? <DashboardPage /> : <MiTrabajoPage />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<InicioRoute />} />
          <Route path="/proyectos" element={<ProyectosPage />} />
          <Route path="/proyectos/:id/*" element={<ProyectoPage />} />
          <Route path="/mis-documentos" element={<DocumentosPage modo="mios" />} />
          <Route path="/ayuda" element={<AyudaPage />} />
          <Route element={<RequireEditor />}>
            <Route path="/cms" element={<CmsPage />} />
            <Route path="/biblioteca" element={<MediosPage />} />
          </Route>
          <Route element={<RequireAdmin />}>
            <Route path="/usuarios" element={<UsuariosPage />} />
            <Route path="/clientes" element={<ClientesPage />} />
            <Route path="/gastos-empresa" element={<GastosEmpresaPage />} />
            <Route path="/trabajadores" element={<TrabajadoresPage />} />
            <Route path="/servicios" element={<ServiciosPage />} />
            <Route path="/mensajes" element={<MensajesPage />} />
            <Route path="/auditoria" element={<AuditoriaPage />} />
            <Route path="/documentos" element={<DocumentosPage modo="todos" />} />
            <Route path="/datos-empresa" element={<SitioPage />} />
            <Route path="/proyectos-realizados" element={<PortafolioPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
