import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateEstablishmentDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsString()
  @Length(11, 18)
  cnpj: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  // Admin inicial do estabelecimento (para logar no PDV).
  @IsOptional()
  @IsString()
  @MaxLength(120)
  adminName?: string;

  @IsEmail()
  adminEmail: string;

  @IsString()
  @MinLength(6)
  adminPassword: string;
}
