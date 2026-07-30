import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePrinterDto {
  @IsString()
  @MaxLength(60)
  name: string;

  // IP fixo da impressora na rede do restaurante.
  @IsString()
  @MaxLength(120)
  host: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  @Type(() => Number)
  port?: number;

  // 48 para bobina de 80mm, 32 para 58mm.
  @IsOptional()
  @IsInt()
  @Min(20)
  @Max(96)
  @Type(() => Number)
  columns?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  copies?: number;
}

export class UpdatePrinterDto extends CreatePrinterDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  declare name: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  declare host: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
