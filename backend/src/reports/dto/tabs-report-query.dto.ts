import { IsDateString, IsOptional } from 'class-validator';

export class TabsReportQueryDto {
  // Data no formato YYYY-MM-DD. Padrão: hoje.
  @IsOptional()
  @IsDateString()
  date?: string;
}
