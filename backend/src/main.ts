import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Necessário para o onApplicationShutdown (desconecta o Prisma).
  app.enableShutdownHooks();

  // Prefixo global de API versionada.
  app.setGlobalPrefix('api/v1');

  // Validação/transform automáticos dos DTOs.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS: aceita uma ou várias origens separadas por vírgula (ex: domínio
  // com e sem www, ou o preview do EasyPanel junto do domínio final).
  const origins = config
    .get<string>('CORS_ORIGIN', 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origins.length > 1 ? origins : origins[0],
    credentials: true,
  });

  const port = config.get<number>('BACKEND_PORT', 3000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`🚀 Backend em http://localhost:${port}/api/v1`);
}
bootstrap();
