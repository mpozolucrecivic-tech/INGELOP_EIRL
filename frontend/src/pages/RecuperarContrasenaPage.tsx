import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { mensajeError } from '@/api/client';
import { useOpcionesAuth, useSolicitarRecuperacion } from '@/api/cuenta';
import { AuthShell, Aviso } from '@/components/layout/AuthShell';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Display';
import { Input } from '@/components/ui/Field';

const schema = z.object({ email: z.string().trim().min(1, 'Ingresa tu correo').email('Correo inválido') });
type FormData = z.infer<typeof schema>;

export default function RecuperarContrasenaPage() {
  const opciones = useOpcionesAuth();
  const solicitar = useSolicitarRecuperacion();
  const [enviado, setEnviado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = ({ email }: FormData) => {
    setError(null);
    return solicitar.mutateAsync(email).then(
      (r) => setEnviado(r.message),
      (e) => setError(mensajeError(e, 'No se pudo enviar la solicitud')),
    );
  };

  return (
    <AuthShell title="¿Olvidaste tu contraseña?" subtitle="Te enviaremos un enlace a tu correo para elegir una nueva.">
      {opciones.isLoading ? (
        <Spinner />
      ) : !opciones.data?.recuperacionContrasena ? (
        <Aviso tono="info">La recuperación por correo no está disponible. Pide a la jefatura que te asigne una contraseña nueva desde «Accesos».</Aviso>
      ) : enviado ? (
        <div className="space-y-3">
          <Aviso tono="exito">{enviado}</Aviso>
          <p className="text-sm text-slate-500">El enlace vence en 30 minutos. Si no llega, espera un par de minutos antes de pedir otro.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {error && <Aviso tono="error">{error}</Aviso>}
          <Input label="Correo de tu cuenta" type="email" autoComplete="email" placeholder="nombre@ingelop.com" error={errors.email?.message} {...register('email')} />
          <Button type="submit" loading={solicitar.isPending} className="w-full">
            Enviar enlace
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
