import { IsNumber, Min } from 'class-validator';

export class OpenCashRegisterDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  openingAmount: number;
}
