import { Role } from '@prisma/client';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ALL_PERMISSIONS } from '../../auth/permissions';

export class CreateUserDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(Role)
  role: Role;

  // Permissões escolhidas pelo dono. Se omitido, aplica o padrão do papel.
  @IsOptional()
  @IsArray()
  @IsIn(ALL_PERMISSIONS as readonly string[], { each: true })
  permissions?: string[];

  // PIN de operação (opcional).
  @IsOptional()
  @IsString()
  @Length(4, 8)
  pinCode?: string;
}
