import type { Plan } from '@/lib/schemas';
import { buildPacingWarnings } from '@/lib/math';

export function PacingWarnings({ plan }: { plan: Plan }) {
  const warnings = buildPacingWarnings(plan);
  if (warnings.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
        Pacing looks healthy across all line items.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <h3 className="text-sm font-semibold text-amber-800">Pacing Warnings</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800">
        {warnings.map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
      </ul>
    </div>
  );
}
