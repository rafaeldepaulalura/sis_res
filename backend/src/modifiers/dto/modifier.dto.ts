import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateModifierGroupDto {
  @IsString()
  @MaxLength(80)
  name: string;

  // Obrigatório = o cliente tem que escolher para conseguir pedir.
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  minSelect?: number;

  // 0 = sem limite de escolhas.
  @IsOptional()
  @IsInt()
  @Min(0)
  maxSelect?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class UpdateModifierGroupDto extends CreateModifierGroupDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  declare name: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CreateModifierOptionDto {
  @IsString()
  @MaxLength(80)
  name: string;

  // Quanto soma ao preço do produto. 0 para coisas como "sem cebola".
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  priceDelta?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class UpdateModifierOptionDto extends CreateModifierOptionDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  declare name: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

// Define quais grupos o produto usa (substitui a lista inteira).
export class SetProductGroupsDto {
  @IsArray()
  @IsUUID(undefined, { each: true })
  groupIds: string[];
}
