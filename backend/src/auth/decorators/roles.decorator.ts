import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

// Restringe uma rota às roles informadas (usado pelo RolesGuard).
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
