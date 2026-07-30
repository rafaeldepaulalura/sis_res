import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Category, Product } from '../types/api';

// Todos os produtos (inclui inativos) — para a tela de gestão.
export function useAllProducts() {
  return useQuery({
    queryKey: ['products', 'all'],
    queryFn: async () => (await api.get<Product[]>('/products')).data,
  });
}

function useCatalogMutation<TVars, TData>(fn: (vars: TVars) => Promise<TData>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

// ---- Categorias ----

export interface CategoryInput {
  name: string;
  order?: number;
  // Categoria de pizza: permite montar item com 2 sabores (meia a meia).
  allowsHalf?: boolean;
  // Impressora do setor que prepara a categoria; null volta para "só tela".
  printerId?: string | null;
}

export function useCreateCategory() {
  return useCatalogMutation((dto: CategoryInput) =>
    api.post<Category>('/categories', dto).then((r) => r.data),
  );
}

export function useUpdateCategory() {
  return useCatalogMutation(
    (vars: { id: string; dto: Partial<CategoryInput> }) =>
      api.patch(`/categories/${vars.id}`, vars.dto).then((r) => r.data),
  );
}

export function useDeleteCategory() {
  return useCatalogMutation((id: string) =>
    api.delete(`/categories/${id}`).then((r) => r.data),
  );
}

// ---- Produtos ----

export interface ProductInput {
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  active?: boolean;
  imageUrl?: string;
}

export function useCreateProduct() {
  return useCatalogMutation((dto: ProductInput) =>
    api.post<Product>('/products', dto).then((r) => r.data),
  );
}

export function useUpdateProduct() {
  return useCatalogMutation(
    (vars: { id: string; dto: Partial<ProductInput> }) =>
      api.patch(`/products/${vars.id}`, vars.dto).then((r) => r.data),
  );
}

export function useDeleteProduct() {
  return useCatalogMutation((id: string) =>
    api.delete(`/products/${id}`).then((r) => r.data),
  );
}
