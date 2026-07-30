import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface Plan {
  id: string;
  name: string;
  monthlyPrice: string;
  includedFiscalDocuments: number;
  overageBlocked: boolean;
  active: boolean;
}

export interface ResellerRow {
  id: string;
  name: string;
  tradeName: string | null;
  cnpj: string;
  email: string;
  active: boolean;
  adminEmail: string | null;
  establishments: number;
  notesThisMonth: number;
  subscription: {
    status: string;
    plan: string;
    monthlyPrice: string;
    currentPeriodEnd: string;
  } | null;
}

export interface AdminMetrics {
  activeResellers: number;
  totalEstablishments: number;
  mrr: string;
  notesThisMonth: number;
}

export function usePlans() {
  return useQuery({
    queryKey: ['admin', 'plans'],
    queryFn: async () => (await api.get<Plan[]>('/admin/plans')).data,
  });
}

export function useResellers() {
  return useQuery({
    queryKey: ['admin', 'resellers'],
    queryFn: async () =>
      (await api.get<ResellerRow[]>('/admin/resellers')).data,
  });
}

export function useMetrics() {
  return useQuery({
    queryKey: ['admin', 'metrics'],
    queryFn: async () => (await api.get<AdminMetrics>('/admin/metrics')).data,
  });
}

function useAdminMutation<TVars, TData>(fn: (vars: TVars) => Promise<TData>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  });
}

export function useCreatePlan() {
  return useAdminMutation(
    (dto: {
      name: string;
      monthlyPrice: number;
      includedFiscalDocuments: number;
    }) => api.post('/admin/plans', dto).then((r) => r.data),
  );
}

export interface NewReseller {
  name: string;
  cnpj: string;
  email: string;
  phone?: string;
  planId: string;
  adminEmail?: string;
  adminPassword?: string;
}

export function useCreateReseller() {
  return useAdminMutation((dto: NewReseller) =>
    api.post('/admin/resellers', dto).then((r) => r.data),
  );
}

export function useUpdateReseller() {
  return useAdminMutation(
    (vars: { id: string; dto: { active?: boolean; name?: string } }) =>
      api.patch(`/admin/resellers/${vars.id}`, vars.dto).then((r) => r.data),
  );
}

// Cria o acesso do revendedor (se não existir) ou troca a senha.
export function useSetResellerAdmin() {
  return useAdminMutation(
    (vars: { id: string; email?: string; password: string }) =>
      api
        .put<{ email: string; created: boolean }>(
          `/admin/resellers/${vars.id}/admin`,
          { email: vars.email, password: vars.password },
        )
        .then((r) => r.data),
  );
}

export function useDeleteReseller() {
  return useAdminMutation((id: string) =>
    api.delete(`/admin/resellers/${id}`).then((r) => r.data),
  );
}

export function useChangePlan() {
  return useAdminMutation((vars: { id: string; planId: string }) =>
    api
      .patch(`/admin/resellers/${vars.id}/plan`, { planId: vars.planId })
      .then((r) => r.data),
  );
}
