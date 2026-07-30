import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '../types/auth.types';

// Extrai o usuário autenticado (req.user) ou um campo específico dele.
// Uso: @CurrentUser() user: AuthUser  |  @CurrentUser('establishmentId') id: string
export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: AuthUser = request.user;
    return data ? user?.[data] : user;
  },
);
