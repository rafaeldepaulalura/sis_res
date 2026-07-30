import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { runBypass } from '../prisma/tenant-context';
import { ALL_PERMISSIONS } from './permissions';
import { AuthTokens, JwtPayload } from './types/auth.types';

// Formato do usuário devolvido ao cliente (nunca inclui hash de senha/PIN).
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: User['role'];
  establishmentId: string | null;
  resellerId: string | null;
  // Guia a UI (menu e botões). A checagem de verdade é no backend.
  permissions: string[];
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      establishmentId: user.establishmentId,
      resellerId: user.resellerId,
      // ADMIN é o dono: acesso total independente do que está gravado.
      permissions:
        user.role === Role.ADMIN ? [...ALL_PERMISSIONS] : user.permissions,
    };
  }

  // Valida credenciais e retorna o usuário (ou lança 401).
  // Bypass: login acontece antes de existir contexto de tenant.
  async validateUser(email: string, password: string): Promise<User> {
    const user = await runBypass(() =>
      this.prisma.user.findFirst({ where: { email, active: true } }),
    );
    // bcrypt.compare mesmo sem usuário evita timing attack de enumeração.
    const hash = user?.passwordHash ?? '';
    const ok = await bcrypt.compare(password, hash);
    if (!user || !ok) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    return user;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    const tokens = await this.signTokens(user);
    return { user: this.toPublicUser(user), ...tokens };
  }

  async refresh(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    const user = await runBypass(() =>
      this.prisma.user.findUnique({ where: { id: payload.sub } }),
    );
    if (!user || !user.active) {
      throw new UnauthorizedException('Usuário inválido ou inativo');
    }
    const tokens = await this.signTokens(user);
    return { user: this.toPublicUser(user), ...tokens };
  }

  // Valida o PIN de operação sensível do usuário autenticado.
  async checkPin(userId: string, pin: string): Promise<{ valid: boolean }> {
    const user = await runBypass(() =>
      this.prisma.user.findUnique({ where: { id: userId } }),
    );
    if (!user?.pinCode) {
      throw new UnauthorizedException('Usuário não possui PIN cadastrado');
    }
    const valid = await bcrypt.compare(pin, user.pinCode);
    if (!valid) {
      throw new UnauthorizedException('PIN incorreto');
    }
    return { valid: true };
  }

  private async signTokens(user: User): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      establishmentId: user.establishmentId,
      resellerId: user.resellerId,
      role: user.role,
      email: user.email,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES', '15m'),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES', '7d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
