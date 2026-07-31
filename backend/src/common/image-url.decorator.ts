import { applyDecorators } from '@nestjs/common';
import { IsString, Matches, MaxLength } from 'class-validator';

// Aceita as três formas que o campo de imagem pode ter:
//   "/uploads/<uuid>"  imagem enviada pelo usuário (caso normal hoje)
//   "https://..."      endereço externo colado à mão (o que existia antes)
//   ""                 limpou a imagem
// `@IsUrl` sozinho barrava o caminho relativo do upload e não deixava limpar.
const IMAGE_URL = /^$|^\/uploads\/[0-9a-fA-F-]{36}$|^https?:\/\/[^\s]+$/;

export function IsImageUrl() {
  return applyDecorators(
    IsString(),
    MaxLength(500),
    Matches(IMAGE_URL, {
      message:
        'Imagem inválida: envie um arquivo ou informe um endereço http(s)',
    }),
  );
}
