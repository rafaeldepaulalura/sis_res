import { IsInt, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateDeliveryOrderDto {
  @IsUUID()
  orderId: string;

  @IsUUID()
  customerAddressId: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  deliveryFee?: number;

  // Tempo estimado em minutos.
  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedTime?: number;
}
