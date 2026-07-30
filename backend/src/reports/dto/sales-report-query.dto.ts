import { IsDateString, IsOptional } from 'class-validator';

export class SalesReportQueryDto {
  // Datas no formato YYYY-MM-DD (inclusivas). Padrão: últimos 7 dias.
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
