import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateEstablishmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(11, 18)
  cnpj?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  // Cota mensal de notas fiscais para este estabelecimento; null = sem limite.
  @IsOptional()
  @IsInt()
  @Min(0)
  fiscalDocumentQuota?: number | null;
}
