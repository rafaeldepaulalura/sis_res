import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateDeliverySettingsDto {
  // Taxa usada quando o bairro não tem valor próprio.
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  deliveryFee?: number;

  // Pedido mínimo para aceitar entrega (0 = sem mínimo).
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  deliveryMinOrder?: number;

  // Acima deste valor a entrega sai de graça (null = nunca).
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  deliveryFreeAbove?: number | null;
}

export class UpsertZoneDto {
  @IsString()
  @MaxLength(120)
  neighborhood: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  fee: number;

  // Desativado = não entregamos nesse bairro.
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
