import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface EstablishmentBranding {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string | null;
  // Travas que exigem PIN do gerente na ação.
  requirePinForDiscount: boolean;
  requirePinForCancelItem: boolean;
}

export function useEstablishmentBranding() {
  return useQuery({
    queryKey: ['establishment', 'branding'],
    queryFn: async () =>
      (await api.get<EstablishmentBranding>('/establishments/me')).data,
  });
}

export function useUpdateEstablishmentBranding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      name?: string;
      logoUrl?: string;
      primaryColor?: string;
      requirePinForDiscount?: boolean;
      requirePinForCancelItem?: boolean;
    }) => {
      return (
        await api.patch<EstablishmentBranding>('/establishments/me', dto)
      ).data;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['establishment', 'branding'] }),
  });
}
