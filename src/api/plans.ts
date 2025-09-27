import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { store } from '@/store';
import type {
  Plan,
  Channel,
  LineItem,
  Flight,
  Audience,
  Vendor,
  Creative,
  Tracking,
} from '@/lib/schemas';

const planKeys = {
  all: ['plans'] as const,
  detail: (id: string) => ['plans', id] as const,
};

export function usePlans() {
  return useQuery({
    queryKey: planKeys.all,
    queryFn: () => store.listPlans(),
  });
}

export function usePlan(id: string | undefined) {
  return useQuery({
    enabled: Boolean(id),
    queryKey: planKeys.detail(id ?? 'unknown'),
    queryFn: () => store.getPlan(id ?? ''),
  });
}

export function useMutatePlan() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (plan: Plan) => store.savePlan(plan),
    onSuccess: (plan) => {
      client.invalidateQueries({ queryKey: planKeys.all });
      client.setQueryData(planKeys.detail(plan.id), plan);
    },
  });
}

export function useCreatePlan() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => store.createPlan(),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: planKeys.all });
    },
  });
}

export function useDuplicatePlan() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, actor }: { id: string; actor: string }) => store.duplicatePlan(id, actor),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: planKeys.all });
    },
  });
}

export function useSubmitPlan() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, actor, comment }: { id: string; actor: string; comment?: string }) =>
      store.submitPlan(id, actor, comment),
    onSuccess: (plan) => {
      if (!plan) return;
      client.invalidateQueries({ queryKey: planKeys.all });
      client.setQueryData(planKeys.detail(plan.id), plan);
    },
  });
}

export function useApprovePlan() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, actor, comment }: { id: string; actor: string; comment?: string }) =>
      store.approvePlan(id, actor, comment),
    onSuccess: (plan) => {
      if (!plan) return;
      client.invalidateQueries({ queryKey: planKeys.all });
      client.setQueryData(planKeys.detail(plan.id), plan);
    },
  });
}

export function useRejectPlan() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, actor, comment }: { id: string; actor: string; comment: string }) =>
      store.rejectPlan(id, actor, comment),
    onSuccess: (plan) => {
      if (!plan) return;
      client.invalidateQueries({ queryKey: planKeys.all });
      client.setQueryData(planKeys.detail(plan.id), plan);
    },
  });
}

export function useRevertPlan() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, actor, comment }: { id: string; actor: string; comment?: string }) =>
      store.revertPlan(id, actor, comment),
    onSuccess: (plan) => {
      if (!plan) return;
      client.invalidateQueries({ queryKey: planKeys.all });
      client.setQueryData(planKeys.detail(plan.id), plan);
    },
  });
}

export type ChannelFlighting = {
  lineItem: LineItem;
  flight?: Flight;
  audience?: Audience;
  vendor?: Vendor;
  creative?: Creative;
  tracking?: Tracking;
};

export function useChannelFlightings(planId: string | undefined, channel: Channel) {
  return useQuery({
    enabled: Boolean(planId),
    queryKey: [...planKeys.detail(planId ?? 'unknown'), 'channel-flightings', channel],
    queryFn: async (): Promise<ChannelFlighting[]> => {
      if (!planId) return [];
      const plan = await store.getPlan(planId);
      if (!plan) {
        throw new Error('Plan not found');
      }

      const flightsById = new Map(plan.flights.map((flight) => [flight.flight_id, flight]));
      const audiencesById = new Map(plan.audiences.map((audience) => [audience.audience_id, audience]));
      const vendorsById = new Map(plan.vendors.map((vendor) => [vendor.vendor_id, vendor]));
      const creativesById = new Map(plan.creatives.map((creative) => [creative.creative_id, creative]));
      const trackingByLine = new Map(plan.tracking.map((tracking) => [tracking.line_item_id, tracking]));

      return plan.lineItems
        .filter((item) => item.channel === channel)
        .map((lineItem) => ({
          lineItem,
          flight: flightsById.get(lineItem.flight_id),
          audience: audiencesById.get(lineItem.audience_id),
          vendor: vendorsById.get(lineItem.vendor_id),
          creative: creativesById.get(lineItem.creative_id),
          tracking: trackingByLine.get(lineItem.line_item_id),
        }))
        .sort((a, b) => {
          const aDate = a.flight ? new Date(a.flight.start_date).getTime() : Number.POSITIVE_INFINITY;
          const bDate = b.flight ? new Date(b.flight.start_date).getTime() : Number.POSITIVE_INFINITY;
          return aDate - bDate;
        });
    },
    staleTime: 5 * 60 * 1000,
  });
}
