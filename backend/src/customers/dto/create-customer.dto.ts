import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsString()
  @MaxLength(30)
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  // CPF ou CNPJ (só dígitos ou formatado; validação fiscal fica no Bloco 12).
  @IsOptional()
  @IsString()
  @Length(11, 18)
  document?: string;
}
