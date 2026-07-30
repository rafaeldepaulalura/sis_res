import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  // Categoria de pizza: permite montar item com 2 sabores (meia a meia).
  @IsOptional()
  @IsBoolean()
  allowsHalf?: boolean;
}
