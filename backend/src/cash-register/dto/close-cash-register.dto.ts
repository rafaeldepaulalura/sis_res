import { IsNumber, Min } from 'class-validator';

export class CloseCashRegisterDto {
  // Valor fisicamente contado na gaveta (contagem cega).
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  countedAmount: number;
}
