import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: 'border border-slate-900 bg-slate-900 text-white hover:border-slate-700 hover:bg-slate-700 focus-visible:ring-brand-500',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 focus-visible:ring-slate-400',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-400',
  danger: 'border border-red-600 bg-red-600 text-white hover:border-red-500 hover:bg-red-500 focus-visible:ring-red-500',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, className, children, disabled, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center rounded-md font-semibold transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  );
});

/** Botón cuadrado solo con ícono (con aria-label obligatorio) */
export function IconButton({
  label,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={clsx(
        'inline-flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-40',
        className,
      )}
      {...props}
    />
  );
}
