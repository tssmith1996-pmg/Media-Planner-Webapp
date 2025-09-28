import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { ChannelTable } from '@/components/ChannelTable';
import { plans } from '@/data/seed';
import type { Channel, Plan } from '@/lib/schemas';

const plan = plans[0];
const mutate = vi.fn();

function buildSingleChannelPlan(channel: Channel): Plan {
  const lineItems = plan.lineItems.filter((item) => item.channel === channel);
  const lineItemIds = new Set(lineItems.map((item) => item.line_item_id));
  const flightIds = new Set(lineItems.map((item) => item.flight_id));
  const audienceIds = new Set(lineItems.map((item) => item.audience_id));
  const vendorIds = new Set(lineItems.map((item) => item.vendor_id));
  const creativeIds = new Set(lineItems.map((item) => item.creative_id));

  return {
    ...plan,
    lineItems,
    flights: plan.flights.filter((flight) => flightIds.has(flight.flight_id)),
    audiences: plan.audiences.filter((audience) => audienceIds.has(audience.audience_id)),
    vendors: plan.vendors.filter((vendor) => vendorIds.has(vendor.vendor_id)),
    creatives: plan.creatives.filter((creative) => creativeIds.has(creative.creative_id)),
    tracking: plan.tracking.filter((tracking) => lineItemIds.has(tracking.line_item_id)),
    deliveryActuals: plan.deliveryActuals.filter((actual) => lineItemIds.has(actual.line_item_id)),
  } satisfies Plan;
}

vi.mock('@/api/plans', async () => {
  const actual = await vi.importActual<typeof import('@/api/plans')>('@/api/plans');
  return {
    ...actual,
    useMutatePlan: () => ({ mutate }),
  };
});

vi.mock('@/lib/planBuilders', async () => {
  const actual = await vi.importActual<typeof import('@/lib/planBuilders')>('@/lib/planBuilders');
  const addFn = vi.fn((currentPlan: Plan, channel: Channel) => {
    const template =
      currentPlan.lineItems.find((item) => item.channel === channel) ?? currentPlan.lineItems[0];
    const clone = { ...template, line_item_id: `${template.line_item_id}-copy` };
    return {
      ...currentPlan,
      lineItems: [...currentPlan.lineItems, clone],
    } satisfies Plan;
  });
  const removeFn = vi.fn((currentPlan: Plan, lineItemId: string) => ({
    ...currentPlan,
    lineItems: currentPlan.lineItems.filter((item) => item.line_item_id !== lineItemId),
  }) satisfies Plan);
  return {
    ...actual,
    addFlighting: addFn,
    removeFlighting: removeFn,
  };
});

describe('ChannelTable component', () => {
  beforeEach(() => {
    mutate.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders summary rows for each channel with budget percent', () => {
    render(<ChannelTable plan={plan} readOnly />);
    const summaryTable = screen.getAllByRole('table')[0];
    for (const channel of new Set(plan.lineItems.map((item) => item.channel))) {
      const label = channel.replace(/_/g, ' ');
      expect(within(summaryTable).getAllByText(label).length).toBeGreaterThan(0);
    }
    const budgetCells = screen.getAllByRole('cell', { name: /%$/ });
    expect(budgetCells.length).toBeGreaterThan(0);
  });

  it('expands a channel row to show the flighting table', () => {
    render(<ChannelTable plan={plan} readOnly />);
    const rows = screen.getAllByRole('row');
    const tvRow = rows.find((row) => within(row).queryByText('TV'));
    expect(tvRow).toBeDefined();
    const expandButton = within(tvRow as HTMLElement).getByRole('button', { name: /flightings/i });
    fireEvent.click(expandButton);
    expect(screen.getByRole('columnheader', { name: /vendor \/ platform/i })).toBeInTheDocument();
    expect(screen.getByText(/Totals/i)).toBeInTheDocument();
  });

  it('only shows the add flighting button within an expanded panel', () => {
    render(<ChannelTable plan={plan} readOnly />);
    expect(screen.queryByRole('button', { name: /add flighting/i })).not.toBeInTheDocument();

    const firstSummaryRow = screen
      .getAllByRole('row')
      .find((row) => within(row).queryByRole('button', { name: /view flightings/i }));
    expect(firstSummaryRow).toBeDefined();
    fireEvent.click(within(firstSummaryRow as HTMLElement).getByRole('button', { name: /view flightings/i }));

    const addButtons = screen.getAllByRole('button', { name: /add flighting/i });
    expect(addButtons).toHaveLength(1);
  });

  it('keeps the add flighting button visible when a channel has no flightings', () => {
    const singleChannelPlan = buildSingleChannelPlan('TV');
    render(<ChannelTable plan={singleChannelPlan} readOnly={false} />);

    const tvRow = screen
      .getAllByRole('row')
      .find((row) => within(row).queryByText('TV')) as HTMLElement;
    fireEvent.click(within(tvRow).getByRole('button', { name: /view flightings/i }));

    const deleteButton = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(deleteButton);

    const addButton = screen.getByRole('button', { name: /add flighting/i });
    expect(addButton).toBeInTheDocument();
    expect(addButton).not.toHaveAttribute('disabled');
    expect(screen.queryByRole('button', { name: /view details/i })).not.toBeInTheDocument();
  });

  // Additional interaction coverage lives in channelTable.lib.test.ts for calculated values.
});
