import { IsIn } from 'class-validator';

// A cozinha avança o item; DELIVERED é marcado ao entregar na mesa.
// SENT_TO_KITCHEN também é aceito para permitir "voltar" um item de PREPARING.
export class UpdateKitchenStatusDto {
  @IsIn(['SENT_TO_KITCHEN', 'PREPARING', 'READY', 'DELIVERED'])
  status: 'SENT_TO_KITCHEN' | 'PREPARING' | 'READY' | 'DELIVERED';
}
