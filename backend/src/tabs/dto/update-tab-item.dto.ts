import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateTabItemDto {
  // PIN de quem autoriza o cancelamento, quando o restaurante exige.
  @IsOptional()
  @IsString()
  @Length(4, 8)
  authPin?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  notes?: string;

  // true → cancela o item (status CANCELLED).
  @IsOptional()
  @IsBoolean()
  cancel?: boolean;
}
