import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import clsx from 'clsx';

const controlBase =
  'block w-full rounded-lg border bg-white px-3 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 disabled:bg-slate-100 disabled:text-slate-500';

const borde = (error?: string) => (error ? 'border-red-400' : 'border-slate-300');

interface WrapperProps {
  label?: string;
  error?: string;
  hint?: string;
  id: string;
  children: ReactNode;
  className?: string;
}

function Wrapper({ label, error, hint, id, children, className }: WrapperProps) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

type Common = { label?: string; error?: string; hint?: string; wrapperClassName?: string };

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & Common>(function Input(
  { label, error, hint, wrapperClassName, className, id, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <Wrapper label={label} error={error} hint={hint} id={inputId} className={wrapperClassName}>
      <input ref={ref} id={inputId} aria-invalid={!!error} className={clsx(controlBase, borde(error), 'h-10', className)} {...props} />
    </Wrapper>
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & Common>(function Select(
  { label, error, hint, wrapperClassName, className, id, children, ...props },
  ref,
) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <Wrapper label={label} error={error} hint={hint} id={selectId} className={wrapperClassName}>
      <select ref={ref} id={selectId} aria-invalid={!!error} className={clsx(controlBase, borde(error), 'h-10 pr-8', className)} {...props}>
        {children}
      </select>
    </Wrapper>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & Common>(function Textarea(
  { label, error, hint, wrapperClassName, className, id, rows = 3, ...props },
  ref,
) {
  const autoId = useId();
  const areaId = id ?? autoId;
  return (
    <Wrapper label={label} error={error} hint={hint} id={areaId} className={wrapperClassName}>
      <textarea ref={ref} id={areaId} rows={rows} aria-invalid={!!error} className={clsx(controlBase, borde(error), 'py-2', className)} {...props} />
    </Wrapper>
  );
});
