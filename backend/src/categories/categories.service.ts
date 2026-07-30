import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  create(establishmentId: string, dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        establishmentId,
        name: dto.name,
        order: dto.order ?? 0,
        allowsHalf: dto.allowsHalf ?? false,
      },
    });
  }

  findAll(establishmentId: string) {
    return this.prisma.category.findMany({
      where: { establishmentId },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(establishmentId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, establishmentId },
    });
    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }
    return category;
  }

  async update(establishmentId: string, id: string, dto: UpdateCategoryDto) {
    await this.findOne(establishmentId, id); // garante escopo do tenant
    // A impressora tem que ser deste restaurante — a FK sozinha não checa isso.
    if (dto.printerId) {
      const printer = await this.prisma.printer.findFirst({
        where: { id: dto.printerId, establishmentId },
        select: { id: true },
      });
      if (!printer) {
        throw new NotFoundException('Impressora não encontrada');
      }
    }
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(establishmentId: string, id: string) {
    await this.findOne(establishmentId, id);
    const productCount = await this.prisma.product.count({
      where: { categoryId: id },
    });
    if (productCount > 0) {
      throw new ConflictException(
        'Categoria possui produtos vinculados. Remova ou mova os produtos antes.',
      );
    }
    await this.prisma.category.delete({ where: { id } });
    return { deleted: true };
  }
}
