import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { runBypass } from '../prisma/tenant-context';

// Só formatos que o navegador exibe direto. SVG fica de fora de propósito:
// é XML e pode carregar script (XSS) quando servido do nosso domínio.
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Teto do que chega ao servidor. O front já reduz a imagem antes de enviar,
// então isto é rede de segurança contra arquivo gigante.
export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

// Assinatura dos primeiros bytes do arquivo. Confiar no Content-Type
// declarado deixaria passar qualquer coisa renomeada para .jpg.
function sniff(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)
    return 'image/jpeg';
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return 'image/png';
  }
  if (buf.subarray(0, 3).toString('latin1') === 'GIF') return 'image/gif';
  if (
    buf.subarray(0, 4).toString('latin1') === 'RIFF' &&
    buf.subarray(8, 12).toString('latin1') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

@Injectable()
export class UploadsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    owner: { establishmentId?: string | null; resellerId?: string | null },
    file?: Express.Multer.File,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new BadRequestException('Imagem maior que 3 MB');
    }

    const mimeType = sniff(file.buffer);
    if (!mimeType || !ALLOWED.includes(mimeType)) {
      throw new BadRequestException(
        'Formato não aceito — envie uma imagem JPG, PNG, WEBP ou GIF',
      );
    }

    const upload = await this.prisma.upload.create({
      data: {
        establishmentId: owner.establishmentId ?? null,
        resellerId: owner.establishmentId ? null : (owner.resellerId ?? null),
        mimeType,
        size: file.size,
        data: file.buffer,
      },
      select: { id: true },
    });

    // Caminho relativo à API (e não URL absoluta): o domínio pode mudar sem
    // invalidar o que já está gravado em logoUrl/imageUrl.
    return { id: upload.id, url: `/uploads/${upload.id}` };
  }

  // Servir é público: a imagem aparece no cardápio, que não tem login. Roda
  // com bypass de RLS porque não há tenant no contexto da requisição.
  async serve(id: string) {
    const upload = await runBypass(() =>
      this.prisma.upload.findUnique({
        where: { id },
        select: { data: true, mimeType: true },
      }),
    );
    if (!upload) throw new NotFoundException('Imagem não encontrada');
    return upload;
  }
}
