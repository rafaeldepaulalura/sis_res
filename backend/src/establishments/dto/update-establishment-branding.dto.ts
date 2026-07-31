import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsImageUrl } from '../../common/image-url.decorator';

// Marca própria do estabelecimento (nome, logo, cor) — aplicada ao cardápio
// público e ao PWA do motoboy. Distinto do white-label do revendedor.
export class UpdateEstablishmentBrandingDto {
  // Travas de gerente: exigem PIN de quem tem a permissão para a ação.
  @IsOptional()
  @IsBoolean()
  requirePinForDiscount?: boolean;

  @IsOptional()
  @IsBoolean()
  requirePinForCancelItem?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsImageUrl()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(9)
  primaryColor?: string;
}
