import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rateLimit';

export interface RateLimitOptions {
  /** Máximo de requisições permitidas na janela. */
  limit: number;
  /** Tamanho da janela em segundos. */
  windowSeconds: number;
}

// Limita requisições por IP na rota. Usado em rotas públicas que consultam
// dados de cliente — sem isso alguém poderia varrer telefones em massa.
export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);

interface Bucket {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  // Em memória: suficiente para uma instância. Se o backend for escalado em
  // vários processos, trocar por Redis (o contador seria por processo).
  private readonly buckets = new Map<string, Bucket>();
  private lastSweep = Date.now();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!options) return true;

    const req = context.switchToHttp().getRequest();
    const ip: string = req.ip ?? req.socket?.remoteAddress ?? 'desconhecido';
    const key = `${context.getClass().name}.${context.getHandler().name}:${ip}`;
    const now = Date.now();

    this.sweep(now);

    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, {
        count: 1,
        resetAt: now + options.windowSeconds * 1000,
      });
      return true;
    }

    bucket.count += 1;
    if (bucket.count > options.limit) {
      throw new HttpException(
        'Muitas consultas seguidas. Aguarde um instante e tente de novo.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }

  // Limpa janelas expiradas de tempos em tempos para o Map não crescer sem fim.
  private sweep(now: number) {
    if (now - this.lastSweep < 60_000) return;
    this.lastSweep = now;
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}
