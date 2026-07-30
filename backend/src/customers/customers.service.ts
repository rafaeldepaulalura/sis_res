import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Clientes ----

  create(establishmentId: string, dto: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: { establishmentId, ...dto },
    });
  }

  findAll(establishmentId: string, search?: string) {
    const where: Prisma.CustomerWhereInput = { establishmentId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }
    return this.prisma.customer.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { _count: { select: { addresses: true } } },
    });
  }

  async findOne(establishmentId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, establishmentId },
      include: {
        addresses: { orderBy: [{ isDefault: 'desc' }, { label: 'asc' }] },
      },
    });
    if (!customer) throw new NotFoundException('Cliente não encontrado');
    return customer;
  }

  async update(establishmentId: string, id: string, dto: UpdateCustomerDto) {
    await this.findOne(establishmentId, id);
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  async remove(establishmentId: string, id: string) {
    await this.findOne(establishmentId, id);
    await this.prisma.customer.delete({ where: { id } });
    return { deleted: true };
  }

  // ---- Endereços ----

  private async assertCustomer(establishmentId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, establishmentId },
    });
    if (!customer) throw new NotFoundException('Cliente não encontrado');
  }

  async listAddresses(establishmentId: string, customerId: string) {
    await this.assertCustomer(establishmentId, customerId);
    return this.prisma.customerAddress.findMany({
      where: { customerId },
      orderBy: [{ isDefault: 'desc' }, { label: 'asc' }],
    });
  }

  async createAddress(
    establishmentId: string,
    customerId: string,
    dto: CreateAddressDto,
  ) {
    await this.assertCustomer(establishmentId, customerId);
    return this.prisma.tenantTx(async (tx) => {
      if (dto.isDefault) {
        await tx.customerAddress.updateMany({
          where: { customerId },
          data: { isDefault: false },
        });
      }
      return tx.customerAddress.create({ data: { customerId, ...dto } });
    });
  }

  async updateAddress(
    establishmentId: string,
    customerId: string,
    addressId: string,
    dto: UpdateAddressDto,
  ) {
    await this.assertCustomer(establishmentId, customerId);
    const address = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, customerId },
    });
    if (!address) throw new NotFoundException('Endereço não encontrado');

    return this.prisma.tenantTx(async (tx) => {
      if (dto.isDefault) {
        await tx.customerAddress.updateMany({
          where: { customerId },
          data: { isDefault: false },
        });
      }
      return tx.customerAddress.update({ where: { id: addressId }, data: dto });
    });
  }

  async removeAddress(
    establishmentId: string,
    customerId: string,
    addressId: string,
  ) {
    await this.assertCustomer(establishmentId, customerId);
    const address = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, customerId },
    });
    if (!address) throw new NotFoundException('Endereço não encontrado');
    await this.prisma.customerAddress.delete({ where: { id: addressId } });
    return { deleted: true };
  }
}
