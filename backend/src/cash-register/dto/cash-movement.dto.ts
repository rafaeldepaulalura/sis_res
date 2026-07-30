import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

// Movimento manual: sangria (retirada) ou suprimento (reforço).
// Vendas (SALE) são geradas automaticamente pelos pagamentos em dinheiro.
export class CashMovementDto {
  @IsIn(['WITHDRAWAL', 'DEPOSIT'])
  type: 'WITHDRAWAL' | 'DEPOSIT';

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;
}
