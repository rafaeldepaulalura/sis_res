import { Role } from '@prisma/client';

// Catálogo de permissões de sub-usuário. O dono do restaurante (ADMIN) monta
// o acesso de cada funcionário marcando os itens abaixo.
//
// IMPORTANTE: este catálogo é espelhado em frontend/src/lib/permissions.ts —
// ao mexer aqui, mexa lá também.

// Páginas do PDV (cada uma corresponde a um item do menu lateral).
export const PAGE_PERMISSIONS = [
  'mesas',
  'balcao',
  'comandas',
  'cozinha',
  'delivery',
  'produtos',
  'clientes',
  'financeiro',
  'relatorios',
  'configuracoes',
] as const;

// Ações sensíveis dentro das páginas (não bastam para abrir a página).
export const ACTION_PERMISSIONS = [
  'comanda.desconto',
  'comanda.cancelar_item',
  'caixa.abrir_fechar',
  'caixa.movimentacao',
] as const;

export const ALL_PERMISSIONS = [
  ...PAGE_PERMISSIONS,
  ...ACTION_PERMISSIONS,
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

// Conjunto padrão por papel — aplicado ao criar o usuário e como base
// sugerida na tela. O dono pode customizar item a item depois.
export const DEFAULT_PERMISSIONS: Record<Role, Permission[]> = {
  // ADMIN é o dono: acesso total, não passa pela checagem (ver hasPermission).
  ADMIN: [...ALL_PERMISSIONS],
  MANAGER: [...ALL_PERMISSIONS],
  CASHIER: [
    'mesas',
    'balcao',
    'comandas',
    'delivery',
    'clientes',
    'financeiro',
    'comanda.desconto',
    'comanda.cancelar_item',
    'caixa.abrir_fechar',
    'caixa.movimentacao',
  ],
  WAITER: ['mesas', 'balcao', 'comandas', 'cozinha'],
  KITCHEN: ['cozinha'],
  COURIER: ['delivery'],
  // Papéis fora do estabelecimento têm painel próprio (não usam este catálogo).
  SUPER_ADMIN: [],
  RESELLER_ADMIN: [],
};

// Papéis que operam dentro de um estabelecimento. Use em @Roles nas rotas do
// PDV: o papel só barra quem é de fora (Super Admin / Revendedor); QUEM entra
// de fato é decidido pelas permissões que o dono concedeu, em @Permissions.
export const ESTABLISHMENT_ROLES = [
  Role.ADMIN,
  Role.MANAGER,
  Role.CASHIER,
  Role.WAITER,
  Role.KITCHEN,
] as const;

// ADMIN é o dono do restaurante: sempre tem acesso total, para não conseguir
// se trancar para fora do próprio sistema.
export function hasPermission(
  user: { role: Role; permissions: string[] },
  required: readonly string[],
): boolean {
  if (user.role === Role.ADMIN) return true;
  // Semântica "qualquer uma": a rota libera se o usuário tiver ao menos uma
  // das permissões listadas (ex.: /tabs serve Mesas, Balcão e Comandas).
  return required.some((p) => user.permissions.includes(p));
}
