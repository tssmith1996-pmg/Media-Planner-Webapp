import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlanCard } from '@/components/PlanCard';
import { seedData } from '@/data/seed';

const plan = seedData.plans[0];

describe('PlanCard', () => {
  it('renders plan details and triggers callbacks', () => {
    const onOpen = vi.fn();
    const onReview = vi.fn();
    const onDuplicate = vi.fn();

    render(
      <PlanCard plan={plan} onOpen={onOpen} onReview={onReview} onDuplicate={onDuplicate} />,
    );

    expect(screen.getByText(plan.meta.name)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /open/i }));
    fireEvent.click(screen.getByRole('button', { name: /review/i }));
    fireEvent.click(screen.getByRole('button', { name: /duplicate/i }));

    expect(onOpen).toHaveBeenCalled();
    expect(onReview).toHaveBeenCalled();
    expect(onDuplicate).toHaveBeenCalled();
  });
});
