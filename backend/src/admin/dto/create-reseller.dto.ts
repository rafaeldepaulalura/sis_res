import {
  IsEmail,
  IsHexColor,
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateResellerDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  tradeName?: string;

  @IsString()
  @Length(11, 18)
  cnpj: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  subdomain?: string;

  // Plano da primeira assinatura + duração do período (dias).
  @IsString()
  planId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  periodDays?: number; // padrão 30

  // Usuário admin inicial do revendedor (opcional — permite login no painel).
  @IsOptional()
  @IsEmail()
  adminEmail?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  adminPassword?: string;
}
