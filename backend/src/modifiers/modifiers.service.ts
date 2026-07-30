import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateModifierGroupDto,
  CreateModifierOptionDto,
  SetProductGroupsDto,
  UpdateModifierGroupDto,
  UpdateModifierOptionDto,
} from './dto/modifier.dto';

const groupInclude = {
  options: { orderBy: [{ order: 'asc' as const }, { name: 'asc' as const }] },
  _count: { select: { products: true } },
};

@Injectable()
export class ModifiersService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Grupos ----

  findAll(establishmentId: string) {
    return this.prisma.modifierGroup.findMany({
      where: { establishmentId },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      include: groupInclude,
    });
  }

  private async assertGroup(establishmentId: string, id: string) {
    const group = await this.prisma.modifierGroup.findFirst({
      where: { id, establishmentId },
    });
    if (!group)
      throw new NotFoundException('Grupo de complementos não encontrado');
    return group;
  }

  create(establishmentId: string, dto: CreateModifierGroupDto) {
    return this.prisma.modifierGroup.create({
      data: {
        establishmentId,
        name: dto.name,
        required: dto.required ?? false,
        minSelect: dto.minSelect ?? 0,
        maxSelect: dto.maxSelect ?? 1,
        order: dto.order ?? 0,
      },
      include: groupInclude,
    });
  }

  async update(
    establishmentId: string,
    id: string,
    dto: UpdateModifierGroupDto,
  ) {
    await this.assertGroup(establishmentId, id);
    return this.prisma.modifierGroup.update({
      where: { id },
      data: dto,
      include: groupInclude,
    });
  }

  // Apagar o grupo desliga ele dos produtos junto (cascade) — os pedidos já
  // feitos não mudam, porque guardam uma cópia do que foi escolhido.
  async remove(establishmentId: string, id: string) {
    await this.assertGroup(establishmentId, id);
    await this.prisma.modifierGroup.delete({ where: { id } });
    return { deleted: true };
  }

  // ---- Opções ----

  async addOption(
    establishmentId: string,
    groupId: string,
    dto: CreateModifierOptionDto,
  ) {
    await this.assertGroup(establishmentId, groupId);
    await this.prisma.modifierOption.create({
      data: {
        groupId,
        name: dto.name,
        priceDelta: dto.priceDelta ?? 0,
        order: dto.order ?? 0,
      },
    });
    return this.assertGroupWithOptions(establishmentId, groupId);
  }

  async updateOption(
    establishmentId: string,
    groupId: string,
    optionId: string,
    dto: UpdateModifierOptionDto,
  ) {
    await this.assertGroup(establishmentId, groupId);
    const option = await this.prisma.modifierOption.findFirst({
      where: { id: optionId, groupId },
    });
    if (!option) throw new NotFoundException('Opção não encontrada');
    await this.prisma.modifierOption.update({
      where: { id: optionId },
      data: dto,
    });
    return this.assertGroupWithOptions(establishmentId, groupId);
  }

  async removeOption(
    establishmentId: string,
    groupId: string,
    optionId: string,
  ) {
    await this.assertGroup(establishmentId, groupId);
    const option = await this.prisma.modifierOption.findFirst({
      where: { id: optionId, groupId },
    });
    if (!option) throw new NotFoundException('Opção não encontrada');
    await this.prisma.modifierOption.delete({ where: { id: optionId } });
    return this.assertGroupWithOptions(establishmentId, groupId);
  }

  private assertGroupWithOptions(establishmentId: string, groupId: string) {
    return this.prisma.modifierGroup.findFirst({
      where: { id: groupId, establishmentId },
      include: groupInclude,
    });
  }

  // ---- Vínculo com o produto ----

  async setProductGroups(
    establishmentId: string,
    productId: string,
    dto: SetProductGroupsDto,
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, establishmentId },
    });
    if (!product) throw new NotFoundException('Produto não encontrado');

    // Só aceita grupos do próprio estabelecimento.
    const valid = await this.prisma.modifierGroup.findMany({
      where: { id: { in: dto.groupIds }, establishmentId },
      select: { id: true },
    });

    return this.prisma.tenantTx(async (tx) => {
      await tx.productModifierGroup.deleteMany({ where: { productId } });
      if (valid.length) {
        await tx.productModifierGroup.createMany({
          data: valid.map((g, i) => ({
            productId,
            groupId: g.id,
            order: i,
          })),
        });
      }
      return { groupIds: valid.map((g) => g.id) };
    });
  }

  async getProductGroups(establishmentId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, establishmentId },
      select: {
        modifierGroups: {
          orderBy: { order: 'asc' },
          select: { groupId: true },
        },
      },
    });
    if (!product) throw new NotFoundException('Produto não encontrado');
    return { groupIds: product.modifierGroups.map((g) => g.groupId) };
  }
}
