import { IsUUID } from 'class-validator';

export class TransferTabDto {
  // Mesa de destino (deve estar livre).
  @IsUUID()
  toTableId: string;
}
