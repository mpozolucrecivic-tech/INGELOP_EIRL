import { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import clsx from 'clsx';
import {
  Briefcase,
  Building2,
  CircleHelp,
  Contact,
  FileText,
  FolderOpen,
  HardHat,
  Images,
  Inbox,
  KeyRound,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useMensajesSinLeer } from '@/api/admin';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/components/ui/Display';
import { ROL } from '@/lib/format';

type Acceso = 'todos' | 'admin' | 'editor' | 'usuario';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  acceso: Acceso;
  end?: boolean;
  contador?: 'mensajes';
}

const navGrupos: { titulo?: string; items: NavItem[] }[] = [
  { items: [{ to: '/', label: 'Inicio', icon: LayoutDashboard, acceso: 'todos', end: true }] },
  {
    titulo: 'Trabajo',
    items: [
      { to: '/proyectos', label: 'Proyectos', icon: Building2, acceso: 'todos' },
      { to: '/documentos', label: 'Expedientes', icon: FolderOpen, acceso: 'admin' },
      { to: '/mis-documentos', label: 'Mis documentos', icon: FileText, acceso: 'usuario' },
    ],
  },
  {
    titulo: 'Gestión',
    items: [
      { to: '/clientes', label: 'Clientes', icon: Briefcase, acceso: 'admin' },
      { to: '/gastos-empresa', label: 'Gastos de la empresa', icon: Wallet, acceso: 'admin' },
      { to: '/trabajadores', label: 'Personal y tarifas', icon: HardHat, acceso: 'admin' },
      { to: '/usuarios', label: 'Accesos', icon: KeyRound, acceso: 'admin' },
      { to: '/auditoria', label: 'Auditoría', icon: ShieldCheck, acceso: 'admin' },
    ],
  },
  {
    titulo: 'Página web',
    items: [
      { to: '/cms', label: 'Contenido', icon: Layers, acceso: 'editor' },
      { to: '/biblioteca', label: 'Biblioteca', icon: Images, acceso: 'editor' },
      { to: '/datos-empresa', label: 'Datos de la empresa', icon: Contact, acceso: 'admin' },
      { to: '/servicios', label: 'Servicios', icon: Layers, acceso: 'admin' },
      { to: '/proyectos-realizados', label: 'Portafolio', icon: Images, acceso: 'admin' },
      { to: '/mensajes', label: 'Mensajes', icon: Inbox, acceso: 'admin', contador: 'mensajes' },
    ],
  },
  { items: [{ to: '/ayuda', label: 'Ayuda', icon: CircleHelp, acceso: 'todos' }] },
];

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <img src="/logo.svg?v=2" alt="" className="size-10 shrink-0" />
      <div className="leading-tight">
        <p className="text-sm font-extrabold tracking-[0.12em] text-white">INGELOP</p>
        <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">Consultores y ejecutores</p>
      </div>
    </div>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { usuario, esAdmin, puedeEditarWeb, logout } = useAuth();
  const { data: sinLeer = 0 } = useMensajesSinLeer(esAdmin);
  const visible = (acceso: Acceso) =>
    acceso === 'todos' || (acceso === 'admin' && esAdmin) || (acceso === 'editor' && puedeEditarWeb) || (acceso === 'usuario' && !esAdmin);
  const grupos = navGrupos.map((grupo) => ({ ...grupo, items: grupo.items.filter((item) => visible(item.acceso)) })).filter((grupo) => grupo.items.length);

  return (
    <div className="flex h-full flex-col border-r border-slate-800 bg-slate-950 px-3 py-4">
      <div className="px-2 pb-6 pt-1">
        <Logo />
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto pb-4" aria-label="Navegación principal">
        {grupos.map((grupo, index) => (
          <div key={grupo.titulo ?? index} className="space-y-1">
            {grupo.titulo && <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{grupo.titulo}</p>}
            {grupo.items.map(({ to, label, icon: Icon, end, contador }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  clsx(
                    'group flex items-center gap-3 rounded-md border-l-2 px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'border-brand-400 bg-slate-800 text-white'
                      : 'border-transparent text-slate-300 hover:bg-slate-900 hover:text-white',
                  )
                }
              >
                <Icon className="size-[18px] shrink-0 text-slate-400 transition-colors group-hover:text-brand-400" />
                <span className="flex-1">{label}</span>
                {contador === 'mensajes' && sinLeer > 0 && (
                  <span className="min-w-5 rounded-md bg-brand-500 px-1.5 py-0.5 text-center text-[11px] font-bold text-slate-950" aria-label={`${sinLeer} sin leer`}>
                    {sinLeer}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="border-t border-slate-800 pt-4">
        <div className="flex items-center gap-3 px-2">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-slate-800 text-sm font-bold text-brand-400">
            {usuario?.nombre.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{usuario?.nombre}</p>
            <p className="text-xs text-slate-400">{ROL[esAdmin ? 'ADMIN' : 'USUARIO'].label}</p>
          </div>
          <button
            onClick={logout}
            className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function nombreSeccion(pathname: string) {
  if (pathname === '/') return 'Inicio';
  if (pathname.startsWith('/proyectos/')) return 'Detalle del proyecto';
  const item = navGrupos
    .flatMap((grupo) => grupo.items)
    .find((nav) => nav.to !== '/' && (pathname === nav.to || pathname.startsWith(`${nav.to}/`)));
  return item?.label ?? 'Intranet';
}

export function AppLayout() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const location = useLocation();

  useEffect(() => setMenuAbierto(false), [location.pathname]);

  return (
    <div className="min-h-full bg-slate-100">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <Sidebar />
      </aside>

      {menuAbierto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/70" onClick={() => setMenuAbierto(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 w-72 shadow-2xl" aria-label="Menú móvil">
            <button
              onClick={() => setMenuAbierto(false)}
              className="absolute right-3 top-4 z-10 rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              aria-label="Cerrar menú"
            >
              <X className="size-5" />
            </button>
            <Sidebar onNavigate={() => setMenuAbierto(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:h-16 lg:px-8">
          <button
            onClick={() => setMenuAbierto(true)}
            className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Abrir menú"
          >
            <Menu className="size-5" />
          </button>
          <img src="/logo.svg?v=2" alt="" className="size-7 lg:hidden" />
          <span className="text-sm font-semibold text-slate-700">{nombreSeccion(location.pathname)}</span>
          <span className="ml-auto hidden text-xs font-medium uppercase tracking-wide text-slate-400 sm:block">Gestión documental y de proyectos</span>
        </header>
        <main className="mx-auto max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
          <Suspense fallback={<Spinner />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
