// Conversão do texto da comanda para os bytes que a impressora térmica
// entende (padrão ESC/POS). Função pura — testável sem impressora.

const ESC = 0x1b;
const GS = 0x1d;

// Acentuação: impressora térmica não fala UTF-8. O padrão de mercado no
// Brasil é a página de código 850 (multilíngue latino). Sem este mapa,
// "Ação" sairia como "A??o".
const CP850: Record<string, number> = {
  Ç: 0x80,
  ü: 0x81,
  é: 0x82,
  â: 0x83,
  ä: 0x84,
  à: 0x85,
  å: 0x86,
  ç: 0x87,
  ê: 0x88,
  ë: 0x89,
  è: 0x8a,
  ï: 0x8b,
  î: 0x8c,
  ì: 0x8d,
  Ä: 0x8e,
  Å: 0x8f,
  É: 0x90,
  æ: 0x91,
  Æ: 0x92,
  ô: 0x93,
  ö: 0x94,
  ò: 0x95,
  û: 0x96,
  ù: 0x97,
  ÿ: 0x98,
  Ö: 0x99,
  Ü: 0x9a,
  ø: 0x9b,
  '£': 0x9c,
  Ø: 0x9d,
  á: 0xa0,
  í: 0xa1,
  ó: 0xa2,
  ú: 0xa3,
  ñ: 0xa4,
  Ñ: 0xa5,
  ª: 0xa6,
  º: 0xa7,
  Á: 0xb5,
  Â: 0xb6,
  À: 0xb7,
  ã: 0xc6,
  Ã: 0xc7,
  Ê: 0xd2,
  Ë: 0xd3,
  È: 0xd4,
  Í: 0xd6,
  Î: 0xd7,
  Ì: 0xd8,
  Ó: 0xe0,
  ß: 0xe1,
  Ô: 0xe2,
  Ò: 0xe3,
  õ: 0xe4,
  Õ: 0xe5,
  µ: 0xe6,
  Ú: 0xe9,
  Û: 0xea,
  Ù: 0xeb,
  ý: 0xec,
  Ý: 0xed,
  '°': 0xf8,
};

// Converte uma linha de texto para bytes CP850. Caractere fora do mapa e
// fora do ASCII vira "?" em vez de quebrar a impressão.
export function encodeLine(text: string): Buffer {
  const bytes: number[] = [];
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code < 0x80) bytes.push(code);
    else if (CP850[ch] !== undefined) bytes.push(CP850[ch]);
    else bytes.push(0x3f); // ?
  }
  return Buffer.from(bytes);
}

// Marcações que o gerador de comanda usa para pedir formatação.
// Ex.: "@big:MESA 3" sai grande; "@center:--- x ---" sai centralizado.
type Estilo = 'big' | 'bold' | 'center' | 'normal';

function parseLinha(linha: string): { estilo: Estilo; texto: string } {
  const m = /^@(big|bold|center):(.*)$/.exec(linha);
  if (!m) return { estilo: 'normal', texto: linha };
  return { estilo: m[1] as Estilo, texto: m[2] };
}

// Monta o pacote completo: inicializa, aplica página de código, imprime as
// linhas com o estilo pedido, avança o papel e corta.
export function buildEscPos(content: string): Buffer {
  const partes: Buffer[] = [
    Buffer.from([ESC, 0x40]), // inicializa a impressora
    Buffer.from([ESC, 0x74, 0x02]), // seleciona a página de código 850
  ];

  for (const linha of content.split('\n')) {
    const { estilo, texto } = parseLinha(linha);

    // Alinhamento: 0 esquerda, 1 centro.
    partes.push(Buffer.from([ESC, 0x61, estilo === 'center' ? 1 : 0]));
    // Tamanho: 0x11 = dobro de largura e altura.
    partes.push(Buffer.from([GS, 0x21, estilo === 'big' ? 0x11 : 0x00]));
    // Negrito para títulos e destaques.
    partes.push(
      Buffer.from([ESC, 0x45, estilo === 'bold' || estilo === 'big' ? 1 : 0]),
    );

    partes.push(encodeLine(texto));
    partes.push(Buffer.from([0x0a])); // quebra de linha
  }

  partes.push(Buffer.from([ESC, 0x61, 0])); // volta o alinhamento
  partes.push(Buffer.from([GS, 0x21, 0x00]));
  partes.push(Buffer.from([ESC, 0x45, 0]));
  partes.push(Buffer.from([0x0a, 0x0a, 0x0a, 0x0a])); // espaço para o corte
  partes.push(Buffer.from([GS, 0x56, 0x42, 0x00])); // corta o papel

  return Buffer.concat(partes);
}

// Divide texto longo respeitando a largura do papel, sem cortar palavra no
// meio — nome de produto grande é comum e ilegível se quebrar errado.
export function wrap(text: string, columns: number): string[] {
  const palavras = text.split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return [''];
  const linhas: string[] = [];
  let atual = '';
  for (const p of palavras) {
    if (!atual) atual = p;
    else if (`${atual} ${p}`.length <= columns) atual += ` ${p}`;
    else {
      linhas.push(atual);
      atual = p;
    }
    // Palavra maior que a linha inteira: parte no limite.
    while (atual.length > columns) {
      linhas.push(atual.slice(0, columns));
      atual = atual.slice(columns);
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}
