import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourierDto } from './dto/create-courier.dto';
import { UpdateCourierDto } from './dto/update-courier.dto';

@Injectable()
export class CouriersService {
  constructor(private readonly prisma: PrismaService) {}

  create(establishmentId: string, dto: CreateCourierDto) {
    return this.prisma.courier.create({ data: { establishmentId, ...dto } });
  }

  findAll(establishmentId: string, availableOnly = false) {
    const where: Prisma.CourierWhereInput = { establishmentId };
    if (availableOnly) {
      where.active = true;
      where.available = true;
    }
    return this.prisma.courier.findMany({ where, orderBy: { name: 'asc' } });
  }

  async findOne(establishmentId: string, id: string) {
    const courier = await this.prisma.courier.findFirst({
      where: { id, establishmentId },
    });
    if (!courier) throw new NotFoundException('Entregador não encontrado');
    return courier;
  }

  async update(establishmentId: string, id: string, dto: UpdateCourierDto) {
    await this.findOne(establishmentId, id);
    return this.prisma.courier.update({ where: { id }, data: dto });
  }
}
