import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface ResellerEstablishment {
  id: string;
  name: string;
  cnpj: string;
  address: string | null;
  phone: string | null;
  active: boolean;
  fiscalDocumentQuota: number | null;
  createdAt: string;
  lastSale: string | null;
}

export interface Branding {
  id: string;
  name: string;
  tradeName: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
}

export interface Usage {
  plan: string | null;
  includedQuota: number;
  extraPurchased: number;
  consumed: number;
  remaining: number;
  byEstablishment: { id: string; name: string; consumed: number }[];
}

export function useMyEstablishments() {
  return useQuery({
    queryKey: ['reseller', 'establishments'],
    queryFn: async () =>
      (await api.get<ResellerEstablishment[]>('/reseller/establishments')).data,
  });
}

export function useBranding() {
  return useQuery({
    queryKey: ['reseller', 'branding'],
    queryFn: async () => (await api.get<Branding>('/reseller/branding')).data,
  });
}

export function useUsage() {
  return useQuery({
    queryKey: ['reseller', 'usage'],
    queryFn: async () => (await api.get<Usage>('/reseller/usage')).data,
  });
}

function useResellerMutation<TVars, TData>(fn: (vars: TVars) => Promise<TData>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reseller'] }),
  });
}

export interface NewEstablishment {
  name: string;
  cnpj: string;
  address?: string;
  phone?: string;
  adminEmail: string;
  adminPassword: string;
}

export function useCreateEstablishment() {
  return useResellerMutation((dto: NewEstablishment) =>
    api.post('/reseller/establishments', dto).then((r) => r.data),
  );
}

export interface UpdateEstablishmentDto {
  name?: string;
  cnpj?: string;
  address?: string;
  phone?: string;
  active?: boolean;
  fiscalDocumentQuota?: number | null;
}

export function useUpdateEstablishment() {
  return useResellerMutation(
    (vars: { id: string; dto: UpdateEstablishmentDto }) =>
      api
        .patch(`/reseller/establishments/${vars.id}`, vars.dto)
        .then((r) => r.data),
  );
}

export function useDeleteEstablishment() {
  return useResellerMutation((id: string) =>
    api.delete(`/reseller/establishments/${id}`).then((r) => r.data),
  );
}

export function useUpdateBranding() {
  return useResellerMutation(
    (dto: { name?: string; tradeName?: string; primaryColor?: string; logoUrl?: string }) =>
      api.patch<Branding>('/reseller/branding', dto).then((r) => r.data),
  );
}
