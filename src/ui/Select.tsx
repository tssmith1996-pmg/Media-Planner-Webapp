import { forwardRef, SelectHTMLAttributes } from 'react';
import clsx from 'clsx';

type Props = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, Props>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={clsx(
      'block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1',
      className,
    )}
    {...props}
  />
));

Select.displayName = 'Select';
