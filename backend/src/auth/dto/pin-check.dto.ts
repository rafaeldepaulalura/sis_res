import { IsString, Length } from 'class-validator';

export class PinCheckDto {
  @IsString()
  @Length(4, 8)
  pin: string;
}
