import { TabType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateTabDto {
  @IsEnum(TabType)
  type: TabType;

  // Obrigatório quando type = TABLE (validado no service).
  @IsOptional()
  @IsUUID()
  tableId?: string;

  // Nome/número da comanda individual ou de balcão.
  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  // Garçom responsável; se omitido, assume o usuário autenticado.
  @IsOptional()
  @IsUUID()
  waiterId?: string;

  // Abre a comanda sem nenhum atendente vinculado (ignora o fallback ao usuário atual).
  @IsOptional()
  @IsBoolean()
  noWaiter?: boolean;
}
