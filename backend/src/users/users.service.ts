import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { DEFAULT_PERMISSIONS } from '../auth/permissions';
import { PrismaService } from '../prisma/prisma.service';
import { runBypass } from '../prisma/tenant-context';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

// Seleção pública — nunca expõe hashes.
const publicSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  permissions: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(establishmentId: string, role?: Role) {
    return this.prisma.user.findMany({
      where: { establishmentId, ...(role ? { role } : {}) },
      orderBy: { name: 'asc' },
      select: publicSelect,
    });
  }

  async create(establishmentId: string, dto: CreateUserDto) {
    // E-mail é a identidade global de login (unique no banco), então a
    // checagem precisa ser global — não só dentro deste estabelecimento.
    const exists = await runBypass(() =>
      this.prisma.user.findUnique({ where: { email: dto.email } }),
    );
    if (exists) {
      throw new ConflictException('Já existe um usuário com esse e-mail');
    }
    return this.prisma.user.create({
      data: {
        establishmentId,
        name: dto.name,
        email: dto.email,
        role: dto.role,
        // Sem escolha explícita, começa com o padrão do papel.
        permissions: dto.permissions ?? DEFAULT_PERMISSIONS[dto.role],
        passwordHash: await bcrypt.hash(dto.password, 10),
        pinCode: dto.pinCode ? await bcrypt.hash(dto.pinCode, 10) : null,
      },
      select: publicSelect,
    });
  }

  async update(establishmentId: string, id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findFirst({
      where: { id, establishmentId },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const data: Prisma.UserUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.permissions !== undefined) data.permissions = dto.permissions;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 10);
    if (dto.pinCode) data.pinCode = await bcrypt.hash(dto.pinCode, 10);

    return this.prisma.user.update({
      where: { id },
      data,
      select: publicSelect,
    });
  }
}
