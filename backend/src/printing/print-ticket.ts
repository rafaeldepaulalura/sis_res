import { wrap } from './escpos';

export interface TicketItem {
  quantity: number;
  name: string;
  // Complementos e observação — o que muda o preparo.
  extras?: string | null;
  notes?: string | null;
}

export interface TicketData {
  // "Mesa 3", "Balcão — João", "Entrega — Ana"
  origem: string;
  // Nome do setor: aparece grande para a cozinha saber que a via é dela.
  setor: string;
  waiter?: string | null;
  items: TicketItem[];
  at: Date;
  // Marca a via como reimpressão, para não virar pedido duplicado.
  reprint?: boolean;
}

const TZ = 'America/Sao_Paulo';

function horario(at: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(at);
}

// Monta o texto da comanda de produção. Sem preço: a cozinha não precisa,
// e valor na via de produção só gera confusão.
export function buildKitchenTicket(data: TicketData, columns: number): string {
  const linha = '-'.repeat(columns);
  const out: string[] = [];

  if (data.reprint) out.push('@center:*** REIMPRESSAO ***');
  out.push(`@big:${data.origem}`);
  out.push(`@center:${data.setor}`);
  out.push(linha);
  out.push(
    data.waiter ? `${horario(data.at)}  ${data.waiter}` : horario(data.at),
  );
  out.push(linha);

  for (const item of data.items) {
    // Quantidade colada no nome, em destaque: é o que a cozinha lê primeiro.
    const titulo = `${item.quantity}x ${item.name}`;
    wrap(titulo, columns).forEach((l, i) =>
      out.push(i === 0 ? `@bold:${l}` : `@bold:  ${l}`),
    );
    // Complementos e observação recuados, para não competir com o item.
    for (const detalhe of [item.extras, item.notes]) {
      if (!detalhe) continue;
      wrap(detalhe, columns - 3).forEach((l) => out.push(`   ${l}`));
    }
  }

  out.push(linha);
  return out.join('\n');
}

// Página de teste: confirma IP, porta e acentuação antes do movimento.
export function buildTestTicket(printerName: string, columns: number): string {
  return [
    '@big:TESTE',
    `@center:${printerName}`,
    '-'.repeat(columns),
    `Colunas configuradas: ${columns}`,
    'Acentuacao: ação, pão, café, jiló',
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    '0123456789',
    '-'.repeat(columns),
    '@center:Se leu isto, esta impressora',
    '@center:esta pronta para uso.',
  ].join('\n');
}
