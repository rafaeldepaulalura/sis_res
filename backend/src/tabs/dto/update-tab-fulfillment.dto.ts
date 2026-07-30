import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class UpdateTabFulfillmentDto {
  @IsBoolean()
  isDelivery: boolean;

  // Campos abaixo só são aplicados quando isDelivery = true; caso contrário
  // são ignorados e limpos (courierId/deliveryAddressId voltam a null).
  @IsOptional()
  @IsUUID()
  courierId?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  deliveryAddressId?: string;
}
