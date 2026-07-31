import { IsHexColor, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsImageUrl } from '../../common/image-url.decorator';

export class UpdateBrandingDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  tradeName?: string;

  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @IsOptional()
  @IsImageUrl()
  logoUrl?: string;
}
