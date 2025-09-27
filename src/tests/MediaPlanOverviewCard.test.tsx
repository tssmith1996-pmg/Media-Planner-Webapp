import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MediaPlanOverviewCard } from '@/components/MediaPlanOverviewCard';
import { plans } from '@/data/seed';

const plan = plans[0];

describe('MediaPlanOverviewCard', () => {
  it('shows core metadata for the media plan', () => {
    render(<MediaPlanOverviewCard plan={plan} />);

    expect(screen.getByRole('heading', { name: plan.meta.name })).toBeInTheDocument();
    expect(screen.getByText(/Client:\s*Aurora Beverages/i)).toBeInTheDocument();
    expect(screen.getByText(plan.meta.code)).toBeInTheDocument();
    expect(screen.getByText(plan.owner)).toBeInTheDocument();
    expect(screen.getByText(/Total cost/i)).toBeInTheDocument();
  });

  it('surfaces the edit action when provided', () => {
    const onEdit = vi.fn();
    render(<MediaPlanOverviewCard plan={plan} onEdit={onEdit} />);

    const button = screen.getByRole('button', { name: /edit plan/i });
    fireEvent.click(button);

    expect(onEdit).toHaveBeenCalledTimes(1);
  });
});
