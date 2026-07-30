// Formata um valor (string/number vindo do Decimal) como BRL.
export function brl(value: string | number): string {
  const n = typeof value === 'string' ? Number(value) : value;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Nome do item na comanda/cozinha. Pizza meia a meia sai com os dois sabores.
// Espelha halfLabel() do backend (backend/src/tabs/pizza-half.ts).
export function itemLabel(item: {
  product: { name: string };
  halfProduct?: { name: string } | null;
}): string {
  return item.halfProduct
    ? `½ ${item.product.name} + ½ ${item.halfProduct.name}`
    : item.product.name;
}
