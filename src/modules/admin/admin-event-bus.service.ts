import { Injectable } from '@nestjs/common';
import { AdminWsGateway } from './admin-ws.gateway';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';

@Injectable()
export class AdminEventBusService {
  constructor(private readonly adminWsGateway: AdminWsGateway) {}

  emit(event: string, data: unknown, requiredRole?: AdminRole) {
    this.adminWsGateway.broadcast(event, data, requiredRole);
  }

  emitNewOrganizerApplication(data: {
    id: string;
    name: string;
    createdAt: Date;
  }) {
    this.emit('organizer.new', data, AdminRole.SUPERADMIN);
  }

  emitPaymentRefund(data: { bookingId: string; amount: number }) {
    this.emit('payment.refund', data, AdminRole.FINANCE);
  }

  emitSafetyIncident(data: { id: string; userId: string; type: string }) {
    this.emit('safety.incident', data, AdminRole.SUPERADMIN);
  }

  emitQueueBacklog(data: { queueName: string; depth: number }) {
    this.emit('queue.backlog', data, AdminRole.SUPERADMIN);
  }
}
