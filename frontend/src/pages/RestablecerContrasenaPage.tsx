import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { erroresDeCampo, mensajeError } from '@/api/client';
import { useRestablecerContrasena } from '@/api/cuenta';
import { AuthShell, Aviso } from '@/components/layout/AuthShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';

const schema = z
  .object({
    nueva: z.string().min(8, 'Mínimo 8 caracteres').max(72, 'Máximo 72 caracteres'),
    confirmar: z.string(),
  })
  .refine((d) => d.nueva === d.confirmar, { message: 'No coincide con la nueva contraseña', path: ['confirmar'] });
type FormData = z.infer<typeof schema>;

/** El token viene en el fragmento (#…), que el navegador no envía al servidor */
function leerToken(): string | null {
  const token = window.location.hash.slice(1);
  return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}

export default function RestablecerContrasenaPage() {
  const [token] = useState(leerToken);
  // Ya leído: se quita de la barra de direcciones y del historial
  useEffect(() => {
    if (window.location.hash) window.history.replaceState(window.history.state, '', window.location.pathname);
  }, []);
  const navigate = useNavigate();
  const restablecer = useRestablecerContrasena();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError: setErrorCampo,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = ({ nueva }: FormData) => {
    setError(null);
    return restablecer.mutateAsync({ token: token!, nueva }).then(
      (r) => navigate('/login', { replace: true, state: { aviso: r.message } }),
      (e) => {
        const campos = erroresDeCampo(e);
        if (campos.nueva) setErrorCampo('nueva', { message: campos.nueva });
        else setError(mensajeError(e, 'No se pudo cambiar la contraseña'));
      },
    );
  };

  return (
    <AuthShell title="Elige una nueva contraseña" subtitle="Después podrás iniciar sesión con ella.">
      {!token ? (
        <div className="space-y-3">
          <Aviso tono="error">Este enlace no es válido o está incompleto. Ábrelo tal como llegó en el correo, o pide uno nuevo.</Aviso>
          <Link to="/recuperar-contrasena" className="text-sm font-medium text-brand-700 hover:underline">
            Pedir un enlace nuevo
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {error && (
            <Aviso tono="error">
              {error}{' '}
              <Link to="/recuperar-contrasena" className="font-semibold underline">
                Pedir un enlace nuevo
              </Link>
            </Aviso>
          )}
          <Input label="Nueva contraseña" type="password" autoComplete="new-password" hint="Mínimo 8 caracteres." error={errors.nueva?.message} {...register('nueva')} />
          <Input label="Repite la nueva contraseña" type="password" autoComplete="new-password" error={errors.confirmar?.message} {...register('confirmar')} />
          <Button type="submit" loading={restablecer.isPending} className="w-full">
            Guardar contraseña
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
