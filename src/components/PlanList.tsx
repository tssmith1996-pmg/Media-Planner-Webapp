import type { Plan } from '@/lib/schemas';
import { PlanCard } from './PlanCard';

export function PlanList({
  plans,
  onOpen,
  onReview,
  onDuplicate,
}: {
  plans: Plan[];
  onOpen: (id: string) => void;
  onReview: (id: string) => void;
  onDuplicate: (id: string) => void;
}) {
  if (plans.length === 0) {
    return <p className="text-sm text-slate-500">No plans yet. Create one to get started.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {plans.map((plan) => (
        <PlanCard
          key={plan.id}
          plan={plan}
          onOpen={() => onOpen(plan.id)}
          onReview={() => onReview(plan.id)}
          onDuplicate={() => onDuplicate(plan.id)}
        />
      ))}
    </div>
  );
}
