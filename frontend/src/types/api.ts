export type Role =
  | 'SUPER_ADMIN'
  | 'RESELLER_ADMIN'
  | 'ADMIN'
  | 'MANAGER'
  | 'CASHIER'
  | 'WAITER'
  | 'KITCHEN'
  | 'COURIER';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  establishmentId: string | null;
  resellerId: string | null;
  // Permissões de sub-usuário (ver lib/permissions.ts). ADMIN vem com todas.
  permissions: string[];
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export type TableStatus = 'FREE' | 'OCCUPIED' | 'AWAITING_PAYMENT' | 'RESERVED';

export interface TableMap {
  id: string;
  number: number;
  status: TableStatus;
  roomArea: { id: string; name: string };
  openTab: { id: string; status: string; openedAt: string } | null;
}

export interface Category {
  id: string;
  name: string;
  order: number;
  // Impressora do setor que prepara esta categoria; null = só tela.
  printerId: string | null;
  // Categoria de pizza: permite montar item com 2 sabores (meia a meia).
  allowsHalf: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: string;
  active: boolean;
  imageUrl: string | null;
  categoryId: string;
  category?: { id: string; name: string };
  // Complementos que o produto oferece (vem junto na listagem).
  modifierGroups?: ModifierGroup[];
}

// Complementos: grupo ("Adicionais") com suas opções ("Bacon +R$5").
export interface ModifierOption {
  id: string;
  name: string;
  priceDelta: string;
  order?: number;
  active?: boolean;
}

export interface ModifierGroup {
  id: string;
  name: string;
  // required + minSelect/maxSelect definem a regra de escolha.
  required: boolean;
  minSelect: number;
  maxSelect: number;
  order?: number;
  active?: boolean;
  options: ModifierOption[];
  // Quantos produtos usam este grupo (só na tela de gestão).
  _count?: { products: number };
}

// Cópia das escolhas gravada no item — não muda se o cardápio mudar depois.
export interface ChosenModifier {
  groupName: string;
  name: string;
  priceDelta: string;
}

export type TabType = 'TABLE' | 'INDIVIDUAL' | 'COUNTER' | 'DELIVERY';
export type TabStatus = 'OPEN' | 'AWAITING_PAYMENT' | 'CLOSED' | 'CANCELLED';
export type TabItemStatus =
  | 'PENDING'
  | 'SENT_TO_KITCHEN'
  | 'PREPARING'
  | 'READY'
  | 'DELIVERED'
  | 'CANCELLED';

export interface TabItem {
  id: string;
  productId: string;
  product: { id: string; name: string };
  // 2º sabor quando é pizza meia a meia; preço já vem pelo sabor mais caro.
  halfProduct: { id: string; name: string } | null;
  // Complementos escolhidos; o valor deles já está no unitPrice.
  modifiers: ChosenModifier[];
  quantity: number;
  unitPrice: string;
  notes: string | null;
  status: TabItemStatus;
}

export interface CustomerAddress {
  id: string;
  label: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault: boolean;
  lat: number | null;
  lng: number | null;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  document: string | null;
  addresses?: CustomerAddress[];
  _count?: { addresses: number };
}

export interface Courier {
  id: string;
  name: string;
  phone: string;
  active: boolean;
  available: boolean;
}

export type DeliveryStatus =
  | 'RECEIVED'
  | 'PREPARING'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export interface DeliveryOrder {
  id: string;
  status: DeliveryStatus;
  deliveryFee: string;
  estimatedTime: number | null;
  statusTimestamps: Record<string, string>;
  order: { id: string; total: string; createdAt: string };
  customerAddress: {
    id: string;
    label: string;
    street: string;
    number: string;
    complement: string | null;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    customer: { id: string; name: string; phone: string };
  };
  courier: { id: string; name: string; phone: string } | null;
}

export interface EligibleOrder {
  id: string;
  total: string;
  createdAt: string;
  customer: { id: string; name: string; addresses: CustomerAddress[] };
}

export type PaymentMethod = 'CASH' | 'CREDIT' | 'DEBIT' | 'PIX' | 'OTHER';

export interface Payment {
  id: string;
  method: PaymentMethod;
  amount: string;
  createdAt: string;
}

export interface Tab {
  id: string;
  type: TabType;
  status: TabStatus;
  label: string | null;
  table: { id: string; number: number } | null;
  waiter: { id: string; name: string } | null;
  customer: { id: string; name: string; phone: string } | null;
  isDelivery: boolean;
  courier: { id: string; name: string; phone: string } | null;
  deliveryAddress: CustomerAddress | null;
  items: TabItem[];
  payments: Payment[];
  totals: {
    subtotal: string;
    // Taxa de entrega da comanda; já somada no total.
    deliveryFee: string;
    total: string;
    paid: string;
    remaining: string;
  };
  openedAt: string;
}
