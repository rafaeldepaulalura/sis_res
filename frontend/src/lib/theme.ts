// Converte "#2563eb" em "37 99 235" (formato usado pela CSS variable
// --color-primary, que o Tailwind consome com alpha).
export function hexToRgbTriplet(hex: string): string | null {
  const m = hex.replace('#', '');
  if (m.length !== 6) return null;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return null;
  return `${r} ${g} ${b}`;
}

// Aplica a cor primária (white-label do revendedor) na raiz do documento.
export function applyPrimaryColor(hex: string | null | undefined) {
  if (!hex) return;
  const triplet = hexToRgbTriplet(hex);
  if (triplet) {
    document.documentElement.style.setProperty('--color-primary', triplet);
  }
}

// Restaura a cor primária padrão do sistema (vermelho).
export function resetPrimaryColor() {
  document.documentElement.style.setProperty('--color-primary', '220 38 38');
}
