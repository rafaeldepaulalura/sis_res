import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateEstablishmentBrandingDto } from './dto/update-establishment-branding.dto';

const selectMe = {
  id: true,
  name: true,
  slug: true,
  logoUrl: true,
  primaryColor: true,
  requirePinForDiscount: true,
  requirePinForCancelItem: true,
} as const;

@Injectable()
export class EstablishmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findMe(establishmentId: string) {
    const establishment = await this.prisma.establishment.findUnique({
      where: { id: establishmentId },
      select: selectMe,
    });
    if (!establishment) {
      throw new NotFoundException('Estabelecimento não encontrado');
    }
    return establishment;
  }

  async updateBranding(
    establishmentId: string,
    dto: UpdateEstablishmentBrandingDto,
  ) {
    await this.findMe(establishmentId);
    return this.prisma.establishment.update({
      where: { id: establishmentId },
      data: dto,
      select: selectMe,
    });
  }
}
