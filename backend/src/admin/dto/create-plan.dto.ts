import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePlanDto {
  @IsString()
  @MaxLength(80)
  name: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  monthlyPrice: number;

  @IsInt()
  @Min(0)
  includedFiscalDocuments: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
