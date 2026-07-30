import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';
import { AddPaymentDto } from './add-payment.dto';

export class CloseTabDto {
  // Desconto aplicado ao total no fechamento (opcional).
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discount?: number;

  // PIN de quem autoriza o desconto, quando o restaurante exige.
  @IsOptional()
  @IsString()
  @Length(4, 8)
  authPin?: string;

  // Pagamentos registrados no fechamento (split). Podem também ter sido
  // registrados antes via POST /tabs/:id/payments.
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddPaymentDto)
  payments?: AddPaymentDto[];
}
