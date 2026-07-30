import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

// Cria o acesso do revendedor (se ainda não existir) ou troca a senha.
export class SetResellerAdminDto {
  // Obrigatório apenas quando o revendedor ainda não tem usuário de acesso.
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(6)
  password: string;
}
