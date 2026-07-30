import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { ModifierGroup } from '../types/api';

const key = ['modifier-groups'];

export function useModifierGroups() {
  return useQuery({
    queryKey: key,
    queryFn: async () =>
      (await api.get<ModifierGroup[]>('/modifier-groups')).data,
    staleTime: 60_000,
  });
}

function useGroupsMutation<TVars, TData>(fn: (vars: TVars) => Promise<TData>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ['product-groups'] });
    },
  });
}

export interface GroupInput {
  name: string;
  required?: boolean;
  minSelect?: number;
  maxSelect?: number;
}

export function useCreateGroup() {
  return useGroupsMutation((dto: GroupInput) =>
    api.post('/modifier-groups', dto).then((r) => r.data),
  );
}

export function useUpdateGroup() {
  return useGroupsMutation(
    (vars: { id: string; dto: Partial<GroupInput> & { active?: boolean } }) =>
      api.patch(`/modifier-groups/${vars.id}`, vars.dto).then((r) => r.data),
  );
}

export function useDeleteGroup() {
  return useGroupsMutation((id: string) =>
    api.delete(`/modifier-groups/${id}`).then((r) => r.data),
  );
}

export function useAddOption() {
  return useGroupsMutation(
    (vars: { groupId: string; name: string; priceDelta: number }) =>
      api
        .post(`/modifier-groups/${vars.groupId}/options`, {
          name: vars.name,
          priceDelta: vars.priceDelta,
        })
        .then((r) => r.data),
  );
}

export function useDeleteOption() {
  return useGroupsMutation((vars: { groupId: string; optionId: string }) =>
    api
      .delete(`/modifier-groups/${vars.groupId}/options/${vars.optionId}`)
      .then((r) => r.data),
  );
}

// ---- Grupos usados por um produto ----

export function useProductGroups(productId: string | null) {
  return useQuery({
    queryKey: ['product-groups', productId],
    queryFn: async () =>
      (
        await api.get<{ groupIds: string[] }>(
          `/products/${productId}/modifier-groups`,
        )
      ).data,
    enabled: !!productId,
  });
}

export function useSetProductGroups() {
  return useGroupsMutation((vars: { productId: string; groupIds: string[] }) =>
    api
      .put(`/products/${vars.productId}/modifier-groups`, {
        groupIds: vars.groupIds,
      })
      .then((r) => r.data),
  );
}
