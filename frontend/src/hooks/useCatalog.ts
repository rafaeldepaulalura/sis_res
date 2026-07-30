import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Category, Product } from '../types/api';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get<Category[]>('/categories')).data,
    staleTime: 60_000,
  });
}

export function useProducts() {
  return useQuery({
    queryKey: ['products', 'active'],
    queryFn: async () =>
      (await api.get<Product[]>('/products?active=true')).data,
    staleTime: 60_000,
  });
}
