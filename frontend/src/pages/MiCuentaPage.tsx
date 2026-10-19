import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { KeyRound } from 'lucide-react';
import { erroresDeCampo, mensajeError } from '@/api/client';
import { useCambiarContrasena } from '@/api/cuenta';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, PageHeader } from '@/components/ui/Display';
import { Input } from '@/components/ui/Field';
import { ROL } from '@/lib/format';

const schema = z
  .object({
    actual: z.string().min(1, 'Ingresa tu contraseña actual'),
    nueva: z.string().min(8, 'Mínimo 8 caracteres').max(72, 'Máximo 72 caracteres'),
    confirmar: z.string(),
  })
  .refine((d) => d.nueva === d.confirmar, { message: 'No coincide con la nueva contraseña', path: ['confirmar'] })
  .refine((d) => d.nueva !== d.actual, { message: 'Debe ser distinta de la actual', path: ['nueva'] });
type FormData = z.infer<typeof schema>;

export default function MiCuentaPage() {
  const { usuario } = useAuth();
  const cambiar = useCambiarContrasena();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { actual: '', nueva: '', confirmar: '' } });

  const onSubmit = ({ actual, nueva }: FormData) =>
    cambiar.mutateAsync({ actual, nueva }).then(
      (r) => {
        toast.success(r.message);
        reset();
      },
      (e) => {
        const campos = erroresDeCampo(e);
        if (campos.actual || campos.nueva) {
          if (campos.actual) setError('actual', { message: campos.actual });
          if (campos.nueva) setError('nueva', { message: campos.nueva });
        } else toast.error(mensajeError(e));
      },
    );

  return (
    <>
      <PageHeader title="Mi cuenta" subtitle="Tus datos de acceso a la intranet." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Datos" subtitle="Para cambiar tu nombre o correo, pídeselo a la jefatura." />
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 p-5 text-sm">
            <dt className="text-slate-500">Nombre</dt>
            <dd className="font-medium text-slate-900">{usuario?.nombre}</dd>
            <dt className="text-slate-500">Correo</dt>
            <dd className="break-all text-slate-900">{usuario?.email}</dd>
            <dt className="text-slate-500">Rol</dt>
            <dd className="text-slate-900">{usuario && ROL[usuario.rol].label}</dd>
          </dl>
        </Card>

        <Card>
          <CardHeader title="Cambiar contraseña" subtitle="Al cambiarla se cierran tus sesiones abiertas en otros equipos." />
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-5" noValidate>
            {/* Ayuda a los gestores de contraseñas a asociar la clave con la cuenta */}
            <input type="email" autoComplete="username" value={usuario?.email ?? ''} readOnly hidden />
            <Input label="Contraseña actual" type="password" autoComplete="current-password" error={errors.actual?.message} {...register('actual')} />
            <Input label="Nueva contraseña" type="password" autoComplete="new-password" hint="Mínimo 8 caracteres." error={errors.nueva?.message} {...register('nueva')} />
            <Input label="Repite la nueva contraseña" type="password" autoComplete="new-password" error={errors.confirmar?.message} {...register('confirmar')} />
            <div className="flex justify-end">
              <Button type="submit" loading={cambiar.isPending} icon={<KeyRound className="size-4" />}>
                Cambiar contraseña
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}
