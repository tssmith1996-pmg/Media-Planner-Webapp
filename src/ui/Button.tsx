import { ButtonHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={clsx(
          'inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
          {
            'border-transparent bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:ring-indigo-500': variant === 'primary',
            'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-indigo-500': variant === 'secondary',
            'border-transparent bg-transparent text-slate-600 hover:bg-slate-100 focus-visible:ring-indigo-500': variant === 'ghost',
            'border-transparent bg-rose-600 text-white hover:bg-rose-500 focus-visible:ring-rose-500': variant === 'danger',
          },
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';
