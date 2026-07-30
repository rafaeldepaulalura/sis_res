import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtPayload } from '../auth/types/auth.types';

// Salas:
//   establishment:<id>  → todos os clientes do estabelecimento (KDS, salão)
//   user:<id>           → um usuário específico (notificação do garçom)
@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class KitchenGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // Autentica o socket via JWT no handshake; entra nas salas do token
  // (nunca confia em establishmentId enviado pelo cliente).
  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.query?.token as string);
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      client.join(`establishment:${payload.establishmentId}`);
      client.join(`user:${payload.sub}`);
      client.data.user = payload;
    } catch {
      client.disconnect();
    }
  }

  emitNewItems(establishmentId: string, payload: unknown) {
    this.server
      .to(`establishment:${establishmentId}`)
      .emit('kitchen:new_item', payload);
  }

  emitStatusChanged(establishmentId: string, payload: unknown) {
    this.server
      .to(`establishment:${establishmentId}`)
      .emit('kitchen:item_status_changed', payload);
  }

  emitWaiterReady(waiterId: string, payload: unknown) {
    this.server.to(`user:${waiterId}`).emit('waiter:item_ready', payload);
  }

  // Pedido entrou pelo cardápio online. Sem este aviso o pedido só apareceria
  // para quem estivesse olhando a tela da cozinha — é assim que restaurante
  // perde entrega.
  emitNewOnlineOrder(establishmentId: string, payload: unknown) {
    this.server
      .to(`establishment:${establishmentId}`)
      .emit('order:new_online', payload);
  }
}
