import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, HardHat } from 'lucide-react';
import { mensajeError } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';

const schema = z.object({
  email: z.string().trim().min(1, 'Ingresa tu correo').email('Correo inválido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { usuario, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  if (usuario) return <Navigate to={usuario.rol === 'ADMIN' ? '/' : '/proyectos'} replace />;

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      await login(data.email, data.password);
      const destino = (location.state as { from?: string } | null)?.from;
      navigate(destino && destino !== '/login' ? destino : '/', { replace: true });
    } catch (e) {
      setError(mensajeError(e, 'No se pudo iniciar sesión'));
    }
  };

  return (
    <div className="grid min-h-full lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-slate-900 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'repeating-linear-gradient(-45deg, #f59e0b 0 24px, transparent 24px 48px)',
          }}
          aria-hidden
        />
        <div className="relative flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-brand-500 text-xl font-black text-slate-900">I</div>
          <div>
            <p className="font-bold tracking-wide text-white">INGELOP</p>
            <p className="text-sm text-slate-400">Consultores y Ejecutores E.I.R.L. · Chiclayo</p>
          </div>
        </div>
        <div className="relative">
          <h1 className="text-4xl font-bold leading-tight text-white">
            Planos, presupuestos y expedientes,
            <br />
            <span className="text-brand-400">en un solo lugar.</span>
          </h1>
          <p className="mt-4 max-w-md text-slate-400">
            Revisiones de planos, presupuestos por partidas, entregables del expediente técnico y horas del equipo, en tiempo real.
          </p>
        </div>
        <p className="relative text-xs text-slate-500">© {new Date().getFullYear()} INGELOP Consultores y Ejecutores E.I.R.L. · RUC 20610231676 · Chiclayo, Lambayeque</p>
      </div>

      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-slate-900 text-brand-400">
              <HardHat className="size-6" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Iniciar sesión</h2>
          <p className="mt-1 text-sm text-slate-500">Ingresa con tu cuenta de la intranet.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                {error}
              </div>
            )}
            <Input label="Correo" type="email" autoComplete="email" placeholder="nombre@ingelop.com" error={errors.email?.message} {...register('email')} />
            <Input label="Contraseña" type="password" autoComplete="current-password" error={errors.password?.message} {...register('password')} />
            <Button type="submit" loading={isSubmitting} className="w-full">
              Ingresar
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
