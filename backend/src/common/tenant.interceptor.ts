import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Role } from '@prisma/client';
import { AuthUser } from '../auth/types/auth.types';
import { runInTenant, type TenantStore } from '../prisma/tenant-context';

// Define o contexto de tenant (RLS) a partir do usuário autenticado.
// Roda depois dos guards, então req.user já está populado.
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const user: AuthUser | undefined = req.user;

    // Rotas públicas (sem usuário): o serviço decide o escopo (ex: por slug).
    if (!user) return next.handle();

    let store: TenantStore;
    if (user.role === Role.SUPER_ADMIN) {
      store = { bypass: true };
    } else if (user.role === Role.RESELLER_ADMIN) {
      store = { resellerId: user.resellerId };
    } else {
      store = { establishmentId: user.establishmentId };
    }

    return new Observable((subscriber) => {
      runInTenant(store, () => {
        next.handle().subscribe({
          next: (v) => subscriber.next(v),
          error: (e) => subscriber.error(e),
          complete: () => subscriber.complete(),
        });
      });
    });
  }
}
