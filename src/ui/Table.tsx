import { ReactNode } from 'react';
import clsx from 'clsx';

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={clsx(
        'overflow-x-auto overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-sm',
        className,
      )}
    >
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-700">{children}</table>
    </div>
  );
}

export function THead({ children, sticky = false }: { children: ReactNode; sticky?: boolean }) {
  return (
    <thead
      className={clsx('bg-slate-50 text-xs uppercase tracking-wide text-slate-500', {
        'sticky top-0 z-10': sticky,
      })}
    >
      {children}
    </thead>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-slate-200 bg-white">{children}</tbody>;
}

export function Th({
  children,
  ariaSort,
}: {
  children: ReactNode;
  ariaSort?: 'none' | 'ascending' | 'descending';
}) {
  return (
    <th className="px-4 py-2 font-medium" aria-sort={ariaSort ?? undefined} scope="col">
      {children}
    </th>
  );
}

export function Td({
  children,
  align,
  colSpan,
}: {
  children: ReactNode;
  align?: 'right' | 'left' | 'center';
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={clsx('px-4 py-2', {
        'text-right': align === 'right',
        'text-center': align === 'center',
        'text-left': align === 'left',
      })}
    >
      {children}
    </td>
  );
}
