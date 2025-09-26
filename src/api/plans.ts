import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { store } from '@/store';
import type { Plan } from '@/lib/schemas';

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
