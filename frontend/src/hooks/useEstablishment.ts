import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface EstablishmentInfo {
  id: string;
  name: string;
  slug: string;
}

export function useEstablishment() {
  return useQuery({
    queryKey: ['establishment', 'me'],
    queryFn: async () =>
      (await api.get<EstablishmentInfo>('/establishments/me')).data,
  });
}
