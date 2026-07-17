import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Trek, TrekStatus } from '../treks/entities/trek.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { AuditLog } from './entities/audit-log.entity';

const MAX_BATCH = 500;

@Injectable()
export class AdminBulkService {
  private readonly logger = new Logger(AdminBulkService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Trek)
    private readonly trekRepo: Repository<Trek>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

  async updateUserStatus(
    ids: string[],
    action: 'suspend' | 'activate',
    reason: string,
    adminId: string,
  ) {
    if (ids.length > MAX_BATCH) {
      throw new BadRequestException(`Max batch size is ${MAX_BATCH}`);
    }

    const users = await this.userRepo.findBy({ id: In(ids) });
    const found = new Set(users.map((u) => u.id));
    const failed: { id: string; error: string }[] = [];

    for (const id of ids) {
      if (!found.has(id)) {
        failed.push({ id, error: 'User not found' });
        continue;
      }
    }

    const isSuspended = action === 'suspend';
    await this.userRepo.update(
      { id: In(ids.filter((id) => found.has(id))) },
      {
        isSuspended,
      },
    );

    const processed = ids.filter((id) => found.has(id));

    await this.auditLogRepo.save(
      processed.map((id) => ({
        actorId: adminId,
        action: `BULK_USER_${action.toUpperCase()}`,
        resourceType: 'user',
        resourceId: id,
        detail: { reason },
      })),
    );

    this.logger.log(`Bulk ${action} ${processed.length} users`);

    return {
      success: processed.map((id) => ({ id })),
      failed,
      totalProcessed: processed.length,
    };
  }

  async approveTreks(ids: string[], adminId: string) {
    if (ids.length > MAX_BATCH) {
      throw new BadRequestException(`Max batch size is ${MAX_BATCH}`);
    }

    const treks = await this.trekRepo.findBy({ id: In(ids) });
    const found = new Set(treks.map((t) => t.id));
    const failed: { id: string; error: string }[] = [];

    for (const id of ids) {
      if (!found.has(id)) {
        failed.push({ id, error: 'Trek not found' });
      }
    }

    const toApprove = ids.filter((id) => found.has(id));
    await this.trekRepo.update(
      { id: In(toApprove) },
      { status: TrekStatus.PUBLISHED },
    );

    await this.auditLogRepo.save(
      toApprove.map((id) => ({
        actorId: adminId,
        action: 'BULK_TREK_APPROVE',
        resourceType: 'trek',
        resourceId: id,
      })),
    );

    this.logger.log(`Bulk approved ${toApprove.length} treks`);

    return {
      success: toApprove.map((id) => ({ id })),
      failed,
      totalProcessed: toApprove.length,
    };
  }

  async generateTickets(ids: string[], adminId: string) {
    if (ids.length > MAX_BATCH) {
      throw new BadRequestException(`Max batch size is ${MAX_BATCH}`);
    }

    const bookings = await this.bookingRepo.findBy({ id: In(ids) });
    const found = new Set(bookings.map((b) => b.id));
    const failed: { id: string; error: string }[] = [];

    for (const id of ids) {
      if (!found.has(id)) {
        failed.push({ id, error: 'Booking not found' });
      }
    }

    const toProcess = ids.filter((id) => found.has(id));
    const metadata = bookings
      .filter((b) => toProcess.includes(b.id))
      .reduce(
        (acc, b) => {
          acc[b.id] = {
            ...((b.metadata ?? {}) as object),
            ticketIssued: true,
            ticketIssuedAt: new Date().toISOString(),
          };
          return acc;
        },
        {} as Record<string, any>,
      );

    for (const booking of bookings) {
      if (metadata[booking.id]) {
        booking.metadata = metadata[booking.id] as any;
      }
    }
    await this.bookingRepo.save(
      bookings.filter((b) => toProcess.includes(b.id)),
    );

    await this.auditLogRepo.save(
      toProcess.map((id) => ({
        actorId: adminId,
        action: 'BULK_TICKET_GENERATE',
        resourceType: 'booking',
        resourceId: id,
      })),
    );

    this.logger.log(`Bulk ticket generation for ${toProcess.length} bookings`);

    return {
      success: toProcess.map((id) => ({ id })),
      failed,
      totalProcessed: toProcess.length,
    };
  }
}
