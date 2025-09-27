import '@testing-library/jest-dom/vitest';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, within, waitFor, fireEvent } from '@testing-library/react';
import { ChannelTable } from '@/components/ChannelTable';
import { plans } from '@/data/seed';
import type { Channel } from '@/lib/schemas';
import type { ChannelFlighting } from '@/api/plans';

const plan = plans[0];

const mockUseChannelFlightings = vi.fn();
const mockMutatePlan = { mutateAsync: vi.fn(), isPending: false };

vi.mock('@/api/plans', async () => {
  const actual = await vi.importActual<typeof import('@/api/plans')>('@/api/plans');
  return {
    ...actual,
    useChannelFlightings: (planId: string | undefined, channel: Channel) =>
      mockUseChannelFlightings(planId, channel),
    useMutatePlan: () => mockMutatePlan,
  };
});

describe('ChannelTable', () => {
  beforeEach(() => {
    mockUseChannelFlightings.mockImplementation((planId: string | undefined, channel: Channel) => {
      const rows: ChannelFlighting[] = plan.lineItems
        .filter((item) => item.channel === channel)
        .map((lineItem) => ({
          lineItem,
          flight: plan.flights.find((flight) => flight.flight_id === lineItem.flight_id),
          vendor: plan.vendors.find((vendor) => vendor.vendor_id === lineItem.vendor_id),
          audience: plan.audiences.find((audience) => audience.audience_id === lineItem.audience_id),
          creative: plan.creatives.find((creative) => creative.creative_id === lineItem.creative_id),
          tracking: plan.tracking.find((tracking) => tracking.line_item_id === lineItem.line_item_id),
        }));

      return {
        data: rows,
        isLoading: false,
        isError: false,
        isRefetching: false,
        refetch: vi.fn(),
      };
    });
  });

  afterEach(() => {
    mockUseChannelFlightings.mockClear();
    mockMutatePlan.mutateAsync.mockClear();
  });

  it('renders a summary row for each channel', () => {
    render(<ChannelTable plan={plan} readOnly />);
    const uniqueChannels = new Set(plan.lineItems.map((item) => item.channel));
    const dropdowns = screen.getAllByRole('combobox');
    expect(dropdowns).toHaveLength(uniqueChannels.size);
  });

  it('updates sorting state for the cost column', () => {
    render(<ChannelTable plan={plan} readOnly />);
    const costHeader = screen.getAllByRole('columnheader', { name: /cost/i })[0];
    expect(costHeader).toHaveAttribute('aria-sort', 'none');
    const sortButton = within(costHeader).getByRole('button', { name: /cost/i });
    fireEvent.click(sortButton);
    expect(costHeader).toHaveAttribute('aria-sort', 'ascending');
    fireEvent.click(sortButton);
    expect(costHeader).toHaveAttribute('aria-sort', 'descending');
  });

  it('expands to show flightings and opens the detail modal', async () => {
    render(<ChannelTable plan={plan} readOnly />);
    const targetChannel: Channel = 'Social';
    const expandButtons = screen.getAllByRole('button', { name: /expand .* channel flightings/i });
    const expandButton = expandButtons.find(
      (button) => button.getAttribute('aria-controls') === `channel-${targetChannel}-panel`,
    );
    expect(expandButton).toBeDefined();
    fireEvent.click(expandButton!);

    expect(mockUseChannelFlightings).toHaveBeenCalledWith(plan.id, targetChannel);

    const firstLineItem = plan.lineItems.find((item) => item.channel === targetChannel);
    const vendorName = firstLineItem
      ? plan.vendors.find((vendor) => vendor.vendor_id === firstLineItem.vendor_id)?.name
      : undefined;
    if (vendorName) {
      const vendorCells = await screen.findAllByText(vendorName);
      expect(vendorCells[0]).toBeInTheDocument();
    }

    const detailButton = await screen.findByRole('button', { name: /view additional details/i });
    fireEvent.click(detailButton);

    expect(await screen.findByRole('heading', { name: /flighting details/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /close dialog/i }));
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: /flighting details/i })).not.toBeInTheDocument(),
    );
  });

  it('exposes budget share and add channel affordances when editable', () => {
    render(<ChannelTable plan={plan} />);
    const budgetHeaders = screen.getAllByRole('columnheader', { name: /budget %/i });
    expect(budgetHeaders.length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /add channel/i })).toBeInTheDocument();
  });
});
