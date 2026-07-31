import axios from 'axios';
import { useMutation, useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '../lib/api';
import type { ModifierGroup } from '../types/api';

// Axios próprio, SEM o interceptor de auth (rotas públicas não usam token),
// mas com a MESMA base da api autenticada — ver comentário em lib/api.ts.
const publicApi = axios.create({ baseURL: API_BASE_URL });

export interface PublicProduct {
  id: string;
  name: string;
  description: string | null;
  price: string;
  // Caminho da foto ("/uploads/<id>") — passe por imagemSrc() para exibir.
  imageUrl: string | null;
  // Complementos que o cliente escolhe ao pedir.
  modifierGroups?: ModifierGroup[];
}

export interface PublicMenu {
  establishment: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    primaryColor: string | null;
  };
  categories: {
    id: string;
    name: string;
    order: number;
    // Categoria de pizza: permite montar item com 2 sabores (meia a meia).
    allowsHalf: boolean;
    products: PublicProduct[];
  }[];
}

export type Fulfillment = 'DELIVERY' | 'PICKUP';
export type PaymentMethod = 'CASH' | 'CREDIT' | 'DEBIT' | 'PIX' | 'OTHER';

export interface PlaceOrderBody {
  items: {
    productId: string;
    // 2º sabor da pizza meia a meia (categoria com allowsHalf).
    halfProductId?: string;
    // Complementos escolhidos.
    modifierOptionIds?: string[];
    quantity: number;
    notes?: string;
  }[];
  fulfillment?: Fulfillment;
  customerName?: string;
  customerPhone?: string;
  paymentMethod?: PaymentMethod;
  address?: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  tableNumber?: number;
}

export interface OrderResult {
  tabId: string;
  label: string;
  itemCount: number;
  subtotal: string;
  // Taxa de entrega cobrada (0 em retirada e mesa).
  deliveryFee: string;
  total: string;
  message: string;
}

export function usePublicMenu(slug: string) {
  return useQuery({
    queryKey: ['public-menu', slug],
    queryFn: async () =>
      (await publicApi.get<PublicMenu>(`/public/menu/${slug}`)).data,
    retry: false,
  });
}

export interface KnownCustomer {
  name: string;
  phone: string;
  address: {
    street: string;
    number: string;
    complement: string | null;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  } | null;
}

// Busca o cliente pelo telefone para preencher o checkout na 2ª compra.
// Devolve null quando ainda não há cadastro (1º pedido).
export async function fetchCustomerByPhone(
  slug: string,
  phone: string,
): Promise<KnownCustomer | null> {
  try {
    const { data } = await publicApi.get<KnownCustomer | null>(
      `/public/menu/${slug}/customer`,
      { params: { phone } },
    );
    return data ?? null;
  } catch {
    // Falha de rede ou limite de consultas: segue com o formulário em branco.
    return null;
  }
}

export interface CepAddress {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
}

// Consulta o CEP nos Correios (ViaCEP). Fora da API do sistema de propósito:
// é serviço público e não precisa passar pelo nosso backend.
export async function fetchAddressByCep(
  cep: string,
): Promise<CepAddress | null> {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.erro) return null;
    return {
      street: data.logradouro ?? '',
      neighborhood: data.bairro ?? '',
      city: data.localidade ?? '',
      state: data.uf ?? '',
    };
  } catch {
    // CEP indisponível: o cliente digita o endereço na mão.
    return null;
  }
}

export interface DeliveryQuote {
  atende: boolean;
  fee: string | null;
  motivo: 'free_above' | 'zone' | 'default' | null;
  minOrder: string;
  abaixoDoMinimo: boolean;
  freeAbove: string | null;
}

// Taxa de entrega do bairro, para mostrar antes do cliente confirmar.
export async function fetchDeliveryQuote(
  slug: string,
  neighborhood: string,
  subtotal: number,
): Promise<DeliveryQuote | null> {
  try {
    const { data } = await publicApi.get<DeliveryQuote>(
      `/public/menu/${slug}/delivery-quote`,
      { params: { neighborhood, subtotal } },
    );
    return data;
  } catch {
    return null;
  }
}

export function usePlaceOrder(slug: string) {
  return useMutation({
    mutationFn: async (body: PlaceOrderBody) =>
      (await publicApi.post<OrderResult>(`/public/menu/${slug}/orders`, body))
        .data,
  });
}
