import { API_BASE_URL } from './api';

// Endereço de exibição de uma imagem gravada em logoUrl/imageUrl.
// O upload grava caminho relativo ("/uploads/<id>"), que precisa do domínio
// da API na frente. Endereços http(s) antigos (colados à mão) continuam
// funcionando como estão.
export function imagemSrc(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (/^(https?:|data:|blob:)/.test(url)) return url;
  return `${API_BASE_URL}${url}`;
}

// Reduz a imagem no navegador antes de enviar: a foto de 5 MB do celular
// vira algo na casa das dezenas de KB, sem depender de processamento no
// servidor e sem inchar o banco.
export async function reduzirImagem(
  file: File,
  maxLado = 1000,
  qualidade = 0.82,
): Promise<Blob> {
  // GIF pode ser animado — redesenhar no canvas mataria a animação.
  if (file.type === 'image/gif') return file;

  const bitmap = await createImageBitmap(file);
  const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * escala);
  const h = Math.round(bitmap.height * escala);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  // PNG preserva transparência (logo costuma ter fundo transparente);
  // foto de produto vira JPEG, que fica bem menor.
  const tipo = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, tipo, qualidade),
  );
  // Se a conversão falhar ou não compensar, manda o original.
  return blob && blob.size < file.size ? blob : file;
}
