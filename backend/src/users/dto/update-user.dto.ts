import { Role } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ALL_PERMISSIONS } from '../../auth/permissions';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  // Substitui a lista inteira de permissões do usuário.
  @IsOptional()
  @IsArray()
  @IsIn(ALL_PERMISSIONS as readonly string[], { each: true })
  permissions?: string[];

  @IsOptional()
  @IsString()
  @Length(4, 8)
  pinCode?: string;
}
