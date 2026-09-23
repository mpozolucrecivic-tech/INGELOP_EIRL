import { Link } from 'react-router';
import { EmptyState } from '@/components/ui/Display';
import { Button } from '@/components/ui/Button';

export default function NotFoundPage() {
  return (
    <EmptyState
      title="Página no encontrada"
      description="La dirección no existe o no tienes acceso a ella."
      action={
        <Link to="/proyectos">
          <Button variant="secondary">Ir a proyectos</Button>
        </Link>
      }
    />
  );
}
