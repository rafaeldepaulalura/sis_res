import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

export interface ProductFilters {
  categoryId?: string;
  active?: boolean;
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  // Garante que a categoria existe e pertence ao mesmo estabelecimento.
  private async assertCategory(establishmentId: string, categoryId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, establishmentId },
    });
    if (!category) {
      throw new BadRequestException(
        'Categoria inválida ou de outro estabelecimento',
      );
    }
  }

  async create(establishmentId: string, dto: CreateProductDto) {
    await this.assertCategory(establishmentId, dto.categoryId);
    return this.prisma.product.create({
      data: {
        establishmentId,
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description ?? null,
        price: dto.price,
        active: dto.active ?? true,
        imageUrl: dto.imageUrl ?? null,
      },
    });
  }

  async findAll(establishmentId: string, filters: ProductFilters = {}) {
    const where: Prisma.ProductWhereInput = { establishmentId };
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.active !== undefined) where.active = filters.active;

    const products = await this.prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        category: { select: { id: true, name: true } },
        // Complementos vêm junto: o PDV já sabe, ao clicar no produto, se
        // precisa abrir a tela de escolha — sem uma segunda requisição.
        modifierGroups: {
          orderBy: { order: 'asc' },
          select: {
            group: {
              select: {
                id: true,
                name: true,
                required: true,
                minSelect: true,
                maxSelect: true,
                active: true,
                options: {
                  where: { active: true },
                  orderBy: [{ order: 'asc' }, { name: 'asc' }],
                  select: { id: true, name: true, priceDelta: true },
                },
              },
            },
          },
        },
      },
    });

    return products.map((p) => ({
      ...p,
      modifierGroups: p.modifierGroups
        .map((link) => link.group)
        .filter((g) => g.active)
        .map((g) => ({ ...g, active: undefined })),
    }));
  }

  async findOne(establishmentId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, establishmentId },
      include: { category: { select: { id: true, name: true } } },
    });
    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }
    return product;
  }

  async update(establishmentId: string, id: string, dto: UpdateProductDto) {
    await this.findOne(establishmentId, id);
    if (dto.categoryId) {
      await this.assertCategory(establishmentId, dto.categoryId);
    }
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  async remove(establishmentId: string, id: string) {
    await this.findOne(establishmentId, id);
    const usageCount = await this.prisma.tabItem.count({
      where: { productId: id },
    });
    if (usageCount > 0) {
      throw new ConflictException(
        'Produto já usado em comandas. Desative-o em vez de excluir.',
      );
    }
    await this.prisma.product.delete({ where: { id } });
    return { deleted: true };
  }
}
