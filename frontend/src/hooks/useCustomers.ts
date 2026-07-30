import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Customer, CustomerAddress } from '../types/api';

export function useCustomers(search: string) {
  return useQuery({
    queryKey: ['customers', search],
    queryFn: async () =>
      (
        await api.get<Customer[]>('/customers', {
          params: search ? { search } : undefined,
        })
      ).data,
  });
}

export function useCustomer(id: string | null) {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: async () => (await api.get<Customer>(`/customers/${id}`)).data,
    enabled: !!id,
  });
}

function useCustomersMutation<TVars, TData>(fn: (vars: TVars) => Promise<TData>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['customer'] });
    },
  });
}

export interface CustomerInput {
  name: string;
  phone: string;
  email?: string;
  document?: string;
}

export function useCreateCustomer() {
  return useCustomersMutation((dto: CustomerInput) =>
    api.post<Customer>('/customers', dto).then((r) => r.data),
  );
}

export function useUpdateCustomer() {
  return useCustomersMutation((vars: { id: string; dto: Partial<CustomerInput> }) =>
    api.patch(`/customers/${vars.id}`, vars.dto).then((r) => r.data),
  );
}

export function useDeleteCustomer() {
  return useCustomersMutation((id: string) =>
    api.delete(`/customers/${id}`).then((r) => r.data),
  );
}

export type AddressInput = Omit<CustomerAddress, 'id'>;

export function useCreateAddress() {
  return useCustomersMutation(
    (vars: { customerId: string; dto: Partial<AddressInput> }) =>
      api
        .post(`/customers/${vars.customerId}/addresses`, vars.dto)
        .then((r) => r.data),
  );
}

export function useDeleteAddress() {
  return useCustomersMutation(
    (vars: { customerId: string; addressId: string }) =>
      api
        .delete(`/customers/${vars.customerId}/addresses/${vars.addressId}`)
        .then((r) => r.data),
  );
}

export function useSetDefaultAddress() {
  return useCustomersMutation(
    (vars: { customerId: string; addressId: string }) =>
      api
        .patch(`/customers/${vars.customerId}/addresses/${vars.addressId}`, {
          isDefault: true,
        })
        .then((r) => r.data),
  );
}
