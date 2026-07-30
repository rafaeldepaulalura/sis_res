import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { hasPermission, Permission } from '../permissions';
import { AuthUser } from '../types/auth.types';

// Guard global de permissão de sub-usuário. Só bloqueia rotas que declaram
// @Permissions(...). Roda depois do JwtAuthGuard (req.user já populado).
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const user: AuthUser = context.switchToHttp().getRequest().user;
    if (!user) return false;
    if (!hasPermission(user, required)) {
      throw new ForbiddenException(
        'Seu usuário não tem permissão para esta ação',
      );
    }
    return true;
  }
}
