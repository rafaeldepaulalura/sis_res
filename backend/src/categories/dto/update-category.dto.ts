import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  // Categoria de pizza: permite montar item com 2 sabores (meia a meia).
  @IsOptional()
  @IsBoolean()
  allowsHalf?: boolean;

  // Impressora do setor que prepara esta categoria. null = não imprime,
  // o setor acompanha pela tela da cozinha.
  @IsOptional()
  @IsUUID()
  @ValidateIf((_, v) => v !== null)
  printerId?: string | null;
}
