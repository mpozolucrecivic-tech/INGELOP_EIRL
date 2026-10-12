import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { Button, IconButton } from './Button';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-3xl' };

export function Modal({ open, onClose, title, description, children, footer, size = 'md' }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  // onClose suele ser una función nueva en cada render: se guarda en una ref para que el efecto
  // de apertura NO se repita al escribir (si no, el foco saltaba al primer campo con cada letra)
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])'),
      ).filter((element) => !element.hasAttribute('hidden'));
      if (!focusable.length) {
        e.preventDefault();
        panelRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Enfoca el primer campo del modal, solo al abrirlo
    requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>('input, select, textarea, button:not([aria-label="Cerrar"])')?.focus();
    });
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      if (previousFocus && document.contains(previousFocus)) previousFocus.focus();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={clsx(
          'relative flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl',
          widths[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-slate-900">
              {title}
            </h2>
            {description && <p id={descriptionId} className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
          <IconButton label="Cerrar" onClick={onClose}>
            <X className="size-4" />
          </IconButton>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  tone?: 'primary' | 'danger';
  onConfirm: () => Promise<unknown> | void;
}

/** Diálogo de confirmación para acciones destructivas */
export function useConfirm() {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [loading, setLoading] = useState(false);

  const dialog = (
    <Modal
      open={!!opts}
      onClose={() => !loading && setOpts(null)}
      title={opts?.title ?? ''}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={() => setOpts(null)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant={opts?.tone ?? 'danger'}
            loading={loading}
            onClick={async () => {
              if (!opts) return;
              setLoading(true);
              try {
                await opts.onConfirm();
                setOpts(null);
              } catch {
                /* el toast de error lo muestra la mutación */
              } finally {
                setLoading(false);
              }
            }}
          >
            {opts?.confirmText ?? 'Eliminar'}
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">{opts?.message}</p>
    </Modal>
  );

  return { confirm: setOpts, dialog, abierto: !!opts };
}
