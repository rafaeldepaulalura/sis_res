import { PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class PublicOrderItemDto {
  @IsUUID()
  productId: string;

  // 2º sabor da pizza meia a meia (categoria com allowsHalf).
  @IsOptional()
  @IsUUID()
  halfProductId?: string;

  // Complementos escolhidos; preço e regras validados no servidor.
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  modifierOptionIds?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  notes?: string;
}

export class PublicAddressDto {
  @IsString()
  @MaxLength(160)
  street: string;

  @IsString()
  @MaxLength(20)
  number: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  complement?: string;

  @IsString()
  @MaxLength(120)
  neighborhood: string;

  @IsString()
  @MaxLength(120)
  city: string;

  @IsString()
  @Length(2, 2)
  state: string;

  @IsString()
  @MaxLength(12)
  zipCode: string;
}

export type Fulfillment = 'DELIVERY' | 'PICKUP';

export class PublicOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PublicOrderItemDto)
  items: PublicOrderItemDto[];

  // Canal do pedido online. Se tableNumber vier preenchido, é consumo na mesa.
  @IsOptional()
  @IsString()
  fulfillment?: Fulfillment;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  customerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  customerPhone?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  // Endereço de entrega (obrigatório quando fulfillment = DELIVERY).
  @IsOptional()
  @ValidateNested()
  @Type(() => PublicAddressDto)
  address?: PublicAddressDto;

  // Número da mesa (QR Code na mesa) — consumo no local.
  @IsOptional()
  @IsInt()
  @Min(1)
  tableNumber?: number;
}
