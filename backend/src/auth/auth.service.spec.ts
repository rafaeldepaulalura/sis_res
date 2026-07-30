import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { ALL_PERMISSIONS } from './permissions';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let findFirst: jest.Mock;
  let findUnique: jest.Mock;

  const baseUser = {
    id: 'user-1',
    establishmentId: 'est-1',
    name: 'Admin',
    email: 'admin@restaurante.local',
    role: Role.ADMIN,
    active: true,
    passwordHash: bcrypt.hashSync('admin123', 10),
    pinCode: bcrypt.hashSync('1234', 10),
  };

  beforeEach(async () => {
    findFirst = jest.fn();
    findUnique = jest.fn();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: { user: { findFirst, findUnique } },
        },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn().mockResolvedValue('signed-token') },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('secret'),
            get: jest.fn().mockReturnValue('15m'),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('login', () => {
    it('retorna tokens e usuário público com credenciais válidas', async () => {
      findFirst.mockResolvedValue(baseUser);
      const result = await service.login('admin@restaurante.local', 'admin123');

      expect(result.accessToken).toBe('signed-token');
      expect(result.refreshToken).toBe('signed-token');
      expect(result.user).toEqual({
        id: 'user-1',
        name: 'Admin',
        email: 'admin@restaurante.local',
        role: Role.ADMIN,
        establishmentId: 'est-1',
        // ADMIN é o dono do restaurante: recebe o catálogo inteiro.
        permissions: [...ALL_PERMISSIONS],
      });
      // nunca expõe hash
      expect(
        (result.user as unknown as Record<string, unknown>).passwordHash,
      ).toBeUndefined();
    });

    it('lança 401 com senha errada', async () => {
      findFirst.mockResolvedValue(baseUser);
      await expect(
        service.login('admin@restaurante.local', 'senha-errada'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('lança 401 quando usuário não existe', async () => {
      findFirst.mockResolvedValue(null);
      await expect(
        service.login('naoexiste@x.com', 'qualquer'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('checkPin', () => {
    it('valida PIN correto', async () => {
      findUnique.mockResolvedValue(baseUser);
      await expect(service.checkPin('user-1', '1234')).resolves.toEqual({
        valid: true,
      });
    });

    it('lança 401 com PIN incorreto', async () => {
      findUnique.mockResolvedValue(baseUser);
      await expect(service.checkPin('user-1', '9999')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('lança 401 quando usuário não tem PIN', async () => {
      findUnique.mockResolvedValue({ ...baseUser, pinCode: null });
      await expect(service.checkPin('user-1', '1234')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });
});
