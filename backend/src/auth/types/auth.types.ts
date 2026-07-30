import { Role } from '@prisma/client';

// Payload assinado dentro do JWT.
export interface JwtPayload {
  sub: string; // userId
  establishmentId?: string | null;
  resellerId?: string | null;
  role: Role;
  email: string;
}

// Objeto anexado em req.user após autenticação (via JwtStrategy.validate).
export interface AuthUser {
  userId: string;
  establishmentId?: string | null;
  resellerId?: string | null;
  role: Role;
  email: string;
  // Lidas do banco a cada request (não do JWT), para que mudanças de
  // permissão valham na hora, sem o funcionário precisar relogar.
  permissions: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
