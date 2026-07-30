import { buildEscPos, encodeLine, wrap } from './escpos';
import { buildKitchenTicket } from './print-ticket';

describe('encodeLine (acentuação)', () => {
  it('converte acento para a página de código 850, não UTF-8', () => {
    // a=0x61, ç=0x87, ã=0xc6, o=0x6f — um byte por caractere.
    // Em UTF-8 seriam 6 bytes e a impressora cuspiria lixo.
    expect([...encodeLine('ação')]).toEqual([0x61, 0x87, 0xc6, 0x6f]);
  });

  it('mantém ASCII intacto', () => {
    expect(encodeLine('Mesa 3').toString('latin1')).toBe('Mesa 3');
  });

  it('caractere sem equivalente vira "?" em vez de quebrar', () => {
    expect([...encodeLine('☕')]).toEqual([0x3f]);
  });
});

describe('wrap (largura do papel)', () => {
  it('quebra sem cortar palavra no meio', () => {
    expect(wrap('Hamburguer Artesanal Duplo', 20)).toEqual([
      'Hamburguer Artesanal',
      'Duplo',
    ]);
  });

  it('parte palavra maior que a linha inteira', () => {
    expect(wrap('AAAAAAAAAAAA', 5)).toEqual(['AAAAA', 'AAAAA', 'AA']);
  });

  it('texto curto fica em uma linha só', () => {
    expect(wrap('Coca Lata', 48)).toEqual(['Coca Lata']);
  });
});

describe('buildEscPos', () => {
  const bytes = (b: Buffer) => [...b];

  it('inicializa a impressora e seleciona a página de código', () => {
    const out = bytes(buildEscPos('oi'));
    expect(out.slice(0, 2)).toEqual([0x1b, 0x40]); // ESC @
    expect(out.slice(2, 5)).toEqual([0x1b, 0x74, 0x02]); // CP850
  });

  it('termina cortando o papel', () => {
    const out = bytes(buildEscPos('oi'));
    expect(out.slice(-4)).toEqual([0x1d, 0x56, 0x42, 0x00]);
  });

  it('aplica tamanho dobrado em @big', () => {
    const out = bytes(buildEscPos('@big:MESA 3'));
    // GS ! 0x11 = largura e altura dobradas
    expect(out).toEqual(expect.arrayContaining([0x1d, 0x21, 0x11]));
    // O texto sai sem a marcação
    expect(Buffer.from(out).toString('latin1')).toContain('MESA 3');
    expect(Buffer.from(out).toString('latin1')).not.toContain('@big');
  });

  it('centraliza em @center', () => {
    const out = bytes(buildEscPos('@center:COZINHA'));
    expect(out).toEqual(expect.arrayContaining([0x1b, 0x61, 0x01]));
  });
});

describe('buildKitchenTicket', () => {
  const base = {
    origem: 'Mesa 3',
    setor: 'COZINHA',
    waiter: 'Bruno',
    at: new Date('2026-07-29T18:45:00Z'),
    items: [
      {
        quantity: 2,
        name: 'Hambúrguer Artesanal',
        extras: 'Ao ponto, Bacon',
        notes: 'sem cebola',
      },
      { quantity: 1, name: 'Coca Lata' },
    ],
  };

  it('mostra origem, setor e itens com quantidade', () => {
    const t = buildKitchenTicket(base, 48);
    expect(t).toContain('@big:Mesa 3');
    expect(t).toContain('@center:COZINHA');
    expect(t).toContain('@bold:2x Hambúrguer Artesanal');
    expect(t).toContain('@bold:1x Coca Lata');
  });

  it('traz complementos e observação recuados', () => {
    const t = buildKitchenTicket(base, 48);
    expect(t).toContain('   Ao ponto, Bacon');
    expect(t).toContain('   sem cebola');
  });

  // A cozinha não decide preço; valor na via de produção só confunde.
  it('não imprime preço', () => {
    expect(buildKitchenTicket(base, 48)).not.toMatch(/R\$|\d+,\d{2}/);
  });

  it('marca reimpressão para não virar pedido duplicado', () => {
    const t = buildKitchenTicket({ ...base, reprint: true }, 48);
    expect(t.split('\n')[0]).toBe('@center:*** REIMPRESSAO ***');
  });

  it('respeita a largura do papel de 58mm', () => {
    const t = buildKitchenTicket(base, 32);
    const maiorLinha = Math.max(
      ...t.split('\n').map((l) => l.replace(/^@(big|bold|center):/, '').length),
    );
    expect(maiorLinha).toBeLessThanOrEqual(32);
  });
});
