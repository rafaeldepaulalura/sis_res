import { IsInt, IsUUID, Min } from 'class-validator';

export class CreateTableDto {
  @IsUUID()
  roomAreaId: string;

  @IsInt()
  @Min(1)
  number: number;
}
