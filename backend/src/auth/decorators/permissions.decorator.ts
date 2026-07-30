import { SetMetadata } from '@nestjs/common';
import { Permission } from '../permissions';

export const PERMISSIONS_KEY = 'permissions';

// Exige que o usuário tenha AO MENOS UMA das permissões listadas.
// Ex.: @Permissions('mesas', 'balcao', 'comandas') em /tabs — a rota serve
// as três telas, então qualquer uma delas libera.
export const Permissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
