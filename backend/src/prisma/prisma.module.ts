import {
  Global,
  Inject,
  Module,
  type OnApplicationShutdown,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPrismaClient, PrismaService } from './prisma.service';

// Desconecta o client no shutdown (o valor de factory não recebe hooks direto).
@Injectable()
class PrismaLifecycle implements OnApplicationShutdown {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  async onApplicationShutdown() {
    await this.prisma.$disconnect();
  }
}

// Global: qualquer módulo injeta o PrismaService (client estendido com RLS).
@Global()
@Module({
  providers: [
    {
      provide: PrismaService,
      useFactory: (config: ConfigService) => {
        const url =
          config.get<string>('APP_DATABASE_URL') ??
          config.getOrThrow<string>('DATABASE_URL');
        return createPrismaClient(url) as unknown as PrismaService;
      },
      inject: [ConfigService],
    },
    PrismaLifecycle,
  ],
  exports: [PrismaService],
})
export class PrismaModule {}
