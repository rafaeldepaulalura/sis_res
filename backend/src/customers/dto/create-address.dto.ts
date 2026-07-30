import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateAddressDto {
  @IsString()
  @MaxLength(60)
  label: string; // ex: "Casa", "Trabalho"

  @IsString()
  @MaxLength(160)
  street: string;

  @IsString()
  @MaxLength(20)
  number: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  complement?: string;

  @IsString()
  @MaxLength(120)
  neighborhood: string;

  @IsString()
  @MaxLength(120)
  city: string;

  @IsString()
  @Length(2, 2)
  state: string; // UF

  @IsString()
  @MaxLength(12)
  zipCode: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;
}
