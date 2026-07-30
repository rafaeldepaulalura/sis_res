import { IsString, MaxLength } from 'class-validator';

export class CreateAreaDto {
  @IsString()
  @MaxLength(80)
  name: string;
}
