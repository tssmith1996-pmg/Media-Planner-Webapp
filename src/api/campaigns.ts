import { useQuery } from '@tanstack/react-query';
import { store } from '@/store';

export function useCampaigns() {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: () => store.listCampaigns(),
  });
}
