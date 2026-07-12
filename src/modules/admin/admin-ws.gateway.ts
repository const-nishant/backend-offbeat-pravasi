import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';

@Injectable()
@WebSocketGateway({
  namespace: '/admin/ws',
  cors: { origin: '*', credentials: true },
})
export class AdminWsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(AdminWsGateway.name);
  private readonly connectedAdmins = new Map<
    string,
    { socketId: string; role: string }
  >();

  constructor(private readonly jwtService: JwtService) {}

  afterInit() {
    this.logger.log('Admin WebSocket gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ?? client.handshake.query?.token;
      if (!token) {
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token as string);
      const role = payload.role as string;
      const adminRoles = Object.values(AdminRole) as string[];

      if (!adminRoles.includes(role)) {
        client.emit('error', { message: 'Admin access required' });
        client.disconnect();
        return;
      }

      this.connectedAdmins.set(payload.sub, {
        socketId: client.id,
        role,
      });

      client.data.adminId = payload.sub;
      client.data.role = role;

      void client.join(`role:${role}`);

      this.logger.log(`Admin connected: ${payload.sub} (${role})`);
      client.emit('connected', { adminId: payload.sub, role });
    } catch {
      client.emit('error', { message: 'Invalid token' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    for (const [adminId, data] of this.connectedAdmins) {
      if (data.socketId === client.id) {
        this.connectedAdmins.delete(adminId);
        this.logger.log(`Admin disconnected: ${adminId}`);
        break;
      }
    }
  }

  broadcast(event: string, data: unknown, requiredRole?: AdminRole) {
    if (!this.server) return;
    if (requiredRole) {
      this.server.to(`role:${requiredRole}`).emit(event, data);
    } else {
      this.server.emit(event, data);
    }
  }
}
