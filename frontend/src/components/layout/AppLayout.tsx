import { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import clsx from 'clsx';
import { Briefcase, Building2, CircleHelp, HardHat, Inbox, KeyRound, Layers, LayoutDashboard, LogOut, Menu, X, type LucideIcon } from 'lucide-react';
import { useMensajesSinLeer } from '@/api/admin';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/components/ui/Display';
import { ROL } from '@/lib/format';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  admin: boolean;
  end?: boolean;
  /** Muestra la cantidad de mensajes sin leer */
  contador?: 'mensajes';
}

// Grupos del menú: el título solo se muestra si el grupo tiene opciones visibles para el rol
const navGrupos: { titulo?: string; items: NavItem[] }[] = [
  { items: [{ to: '/', label: 'Resumen general', icon: LayoutDashboard, admin: true, end: true }] },
  {
    titulo: 'Trabajo',
    items: [
      { to: '/proyectos', label: 'Proyectos', icon: Building2, admin: false },
      { to: '/clientes', label: 'Clientes', icon: Briefcase, admin: true },
    ],
  },
  {
    titulo: 'Personas',
    items: [
      { to: '/trabajadores', label: 'Personal y tarifas', icon: HardHat, admin: true },
      { to: '/usuarios', label: 'Accesos a la intranet', icon: KeyRound, admin: true },
    ],
  },
  {
    titulo: 'Página web',
    items: [
      { to: '/servicios', label: 'Servicios', icon: Layers, admin: true },
      { to: '/mensajes', label: 'Mensajes', icon: Inbox, admin: true, contador: 'mensajes' },
    ],
  },
  { items: [{ to: '/ayuda', label: 'Ayuda', icon: CircleHelp, admin: false }] },
];

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex size-9 items-center justify-center rounded-lg bg-brand-500 text-lg font-black text-slate-900">I</div>
      <div className="leading-tight">
        <p className="text-sm font-bold tracking-wide text-white">INGELOP</p>
        <p className="text-[11px] text-slate-400">Consultores y Ejecutores</p>
      </div>
    </div>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { usuario, esAdmin, logout } = useAuth();
  const { data: sinLeer = 0 } = useMensajesSinLeer(esAdmin);
  const grupos = navGrupos
    .map((g) => ({ ...g, items: g.items.filter((i) => esAdmin || !i.admin) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="flex h-full flex-col bg-slate-900 px-3 py-4">
      <div className="px-2 pb-6">
        <Logo />
      </div>
      <nav className="flex-1 space-y-4 overflow-y-auto" aria-label="Principal">
        {grupos.map((grupo, i) => (
          <div key={grupo.titulo ?? i} className="space-y-1">
            {grupo.titulo && <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{grupo.titulo}</p>}
            {grupo.items.map(({ to, label, icon: Icon, end, contador }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive ? 'bg-slate-800 text-brand-400' : 'text-slate-300 hover:bg-slate-800/60 hover:text-white',
                  )
                }
              >
                <Icon className="size-[18px]" />
                <span className="flex-1">{label}</span>
                {contador === 'mensajes' && sinLeer > 0 && (
                  <span className="rounded-full bg-brand-500 px-2 py-0.5 text-xs font-bold text-slate-900" aria-label={`${sinLeer} sin leer`}>
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
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold text-white">
            {usuario?.nombre.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{usuario?.nombre}</p>
            <p className="text-xs text-slate-400">{ROL[esAdmin ? 'ADMIN' : 'USUARIO'].label}</p>
          </div>
          <button
            onClick={logout}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
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

export function AppLayout() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const location = useLocation();

  useEffect(() => setMenuAbierto(false), [location.pathname]);

  return (
    <div className="min-h-full">
      {/* Sidebar escritorio */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 lg:block">
        <Sidebar />
      </aside>

      {/* Sidebar móvil */}
      {menuAbierto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setMenuAbierto(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 w-64 shadow-xl">
            <button
              onClick={() => setMenuAbierto(false)}
              className="absolute right-3 top-4 z-10 rounded-lg p-1.5 text-slate-400 hover:text-white"
              aria-label="Cerrar menú"
            >
              <X className="size-5" />
            </button>
            <Sidebar onNavigate={() => setMenuAbierto(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden">
          <button onClick={() => setMenuAbierto(true)} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100" aria-label="Abrir menú">
            <Menu className="size-5" />
          </button>
          <span className="font-bold tracking-wide text-slate-900">INGELOP</span>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Suspense fallback={<Spinner />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
