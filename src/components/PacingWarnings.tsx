type WarningLevel = 'error' | 'warning' | 'info';

export type PacingWarning = {
  id: string;
  level: WarningLevel;
  message: string;
  focusKey?: string;
};

type PacingWarningsProps = {
  warnings: PacingWarning[];
  onNavigate?: (warning: PacingWarning) => void;
};

const levelStyles: Record<WarningLevel, string> = {
  error: 'border-rose-200 bg-rose-50 text-rose-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  info: 'border-sky-200 bg-sky-50 text-sky-700',
};

const PacingWarnings = ({ warnings, onNavigate }: PacingWarningsProps): JSX.Element => {
  if (warnings.length === 0) {
    return (
      <section className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
        <h3 className="font-semibold">All clear</h3>
        <p>No pacing or policy warnings detected.</p>
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700">Pacing &amp; policy warnings</h3>
      <ul className="space-y-2">
        {warnings.map((warning) => (
          <li key={warning.id}>
            <button
              type="button"
              onClick={() => onNavigate?.(warning)}
              className={`flex w-full items-start gap-2 rounded border px-3 py-2 text-left text-sm transition hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200 ${levelStyles[warning.level]}`}
            >
              <span className="mt-0.5 text-xs font-semibold uppercase">{warning.level}</span>
              <span>{warning.message}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default PacingWarnings;
