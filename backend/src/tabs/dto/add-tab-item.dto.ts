import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class AddTabItemDto {
  @IsUUID()
  productId: string;

  // 2º sabor da pizza meia a meia (categoria com allowsHalf).
  @IsOptional()
  @IsUUID()
  halfProductId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  notes?: string;

  // Complementos escolhidos (adicionais, ponto da carne, borda...). O preço
  // e a validação das regras do grupo são resolvidos no servidor.
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  modifierOptionIds?: string[];
}
