import { PaymentMethod } from '@prisma/client';
import { IsEnum, IsNumber, Min } from 'class-validator';

export class AddPaymentDto {
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;
}
