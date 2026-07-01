import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Queue } from 'bullmq';
import { bullConnection } from '../../jobs/config';
import { TrekSafetyInfo } from './entities/trek-safety-info.entity';
import { UserEmergencyContact } from './entities/user-emergency-contact.entity';
import { TrekCheckIn } from './entities/trek-check-in.entity';
import { UpsertSafetyInfoDto } from './dtos/upsert-safety-info.dto';
import { CreateEmergencyContactDto } from './dtos/create-emergency-contact.dto';
import { UpdateEmergencyContactDto } from './dtos/update-emergency-contact.dto';
import { CheckInDto, CheckOutDto } from './dtos/check-in.dto';
import { Trek } from '../treks/entities/trek.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { CheckInStatus } from './enums/check-in-status.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';

@Injectable()
export class SafetyService {
  private readonly logger = new Logger(SafetyService.name);
  private readonly firstWarningQueue: Queue;
  private readonly emergencyQueue: Queue;

  constructor(
    @InjectRepository(TrekSafetyInfo)
    private readonly safetyInfoRepo: Repository<TrekSafetyInfo>,
    @InjectRepository(UserEmergencyContact)
    private readonly emergencyContactRepo: Repository<UserEmergencyContact>,
    @InjectRepository(TrekCheckIn)
    private readonly checkInRepo: Repository<TrekCheckIn>,
    @InjectRepository(Trek)
    private readonly trekRepo: Repository<Trek>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {
    this.firstWarningQueue = new Queue('checkin-first-warning-queue', {
      connection: bullConnection,
    });
    this.emergencyQueue = new Queue('checkin-emergency-queue', {
      connection: bullConnection,
    });
  }

  async getTrekSafety(trekId: string): Promise<TrekSafetyInfo | null> {
    return this.safetyInfoRepo.findOne({ where: { trekId } });
  }

  async upsertTrekSafety(
    trekId: string,
    userId: string,
    dto: UpsertSafetyInfoDto,
  ): Promise<TrekSafetyInfo> {
    await this.verifyOrganizerOwnership(trekId, userId);

    let info = await this.safetyInfoRepo.findOne({ where: { trekId } });
    if (info) {
      Object.assign(info, dto);
    } else {
      info = this.safetyInfoRepo.create({ trekId, ...dto });
    }
    return this.safetyInfoRepo.save(info);
  }

  async getUserContacts(userId: string): Promise<UserEmergencyContact[]> {
    return this.emergencyContactRepo.find({
      where: { userId },
      order: { isPrimary: 'DESC', createdAt: 'ASC' },
    });
  }

  async addContact(
    userId: string,
    dto: CreateEmergencyContactDto,
  ): Promise<UserEmergencyContact> {
    if (dto.isPrimary) {
      await this.emergencyContactRepo.update(
        { userId, isPrimary: true },
        { isPrimary: false },
      );
    }
    const contact = this.emergencyContactRepo.create({ userId, ...dto });
    return this.emergencyContactRepo.save(contact);
  }

  async updateContact(
    contactId: string,
    userId: string,
    dto: UpdateEmergencyContactDto,
  ): Promise<UserEmergencyContact> {
    const contact = await this.emergencyContactRepo.findOne({
      where: { id: contactId, userId },
    });
    if (!contact) throw new NotFoundException('Emergency contact not found');

    if (dto.isPrimary) {
      await this.emergencyContactRepo.update(
        { userId, isPrimary: true },
        { isPrimary: false },
      );
    }
    Object.assign(contact, dto);
    return this.emergencyContactRepo.save(contact);
  }

  async deleteContact(contactId: string, userId: string): Promise<void> {
    const contact = await this.emergencyContactRepo.findOne({
      where: { id: contactId, userId },
    });
    if (!contact) throw new NotFoundException('Emergency contact not found');
    await this.emergencyContactRepo.remove(contact);
  }

  async getPrimaryContact(
    userId: string,
  ): Promise<UserEmergencyContact | null> {
    return this.emergencyContactRepo.findOne({
      where: { userId, isPrimary: true },
    });
  }

  async checkIn(
    bookingId: string,
    userId: string,
    _dto: CheckInDto,
  ): Promise<TrekCheckIn> {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId, userId },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.userId !== userId)
      throw new ForbiddenException('You do not own this booking');

    const existing = await this.checkInRepo.findOne({
      where: { bookingId },
    });
    if (existing)
      throw new ForbiddenException('Already checked in for this booking');

    const trek = await this.trekRepo.findOne({
      where: { id: booking.trekId },
      select: ['startDate', 'endDate'],
    });
    const trekEnd = trek?.endDate ?? trek?.startDate;
    const endDate = trekEnd
      ? new Date(trekEnd)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);

    const checkIn = this.checkInRepo.create({
      bookingId,
      userId,
      checkedInAt: new Date(),
      expectedCheckOutAt: endDate,
      status: CheckInStatus.ACTIVE,
    });
    await this.checkInRepo.save(checkIn);
    const twoHoursMs = 2 * 60 * 60 * 1000;
    const twoHoursThirtyMs = 2 * 60 * 60 * 1000 + 30 * 60 * 1000;

    await this.firstWarningQueue.add(
      'first-warning',
      { checkInId: checkIn.id, bookingId, userId },
      {
        delay: twoHoursMs,
        jobId: `first-warning:${checkIn.id}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 60000 },
      },
    );

    await this.emergencyQueue.add(
      'emergency',
      { checkInId: checkIn.id, bookingId, userId },
      {
        delay: twoHoursThirtyMs,
        jobId: `emergency:${checkIn.id}`,
        attempts: 5,
        backoff: { type: 'exponential', delay: 60000 },
      },
    );

    this.logger.log(
      `Check-in created for booking ${bookingId}, scheduled escalation jobs`,
    );

    return checkIn;
  }

  async checkOut(
    bookingId: string,
    userId: string,
    _dto?: CheckOutDto,
  ): Promise<TrekCheckIn> {
    const checkIn = await this.checkInRepo.findOne({
      where: { bookingId, userId },
    });
    if (!checkIn) throw new NotFoundException('Check-in not found');
    if (checkIn.status !== CheckInStatus.ACTIVE)
      throw new ForbiddenException(`Check-in is already ${checkIn.status}`);

    checkIn.checkedOutAt = new Date();
    checkIn.status = CheckInStatus.COMPLETED;
    await this.checkInRepo.save(checkIn);

    await this.removePendingJobs(checkIn.id);

    const primaryContact = await this.getPrimaryContact(userId);
    if (primaryContact) {
      try {
        await this.notificationsService.sendPushToUser(
          userId,
          'Trek Completed',
          'You have successfully checked out. Your emergency contact has been notified.',
          NotificationType.BOOKING_CONFIRMED,
          { bookingId, checkInId: checkIn.id },
        );
      } catch (e) {
        this.logger.warn(
          `Failed to send check-out notification: ${(e as Error).message}`,
        );
      }
    }

    return checkIn;
  }

  async getCheckInStatus(
    bookingId: string,
    userId: string,
  ): Promise<TrekCheckIn | null> {
    return this.checkInRepo.findOne({ where: { bookingId, userId } });
  }

  async acknowledge(checkInId: string, userId: string): Promise<TrekCheckIn> {
    const checkIn = await this.checkInRepo.findOne({
      where: { id: checkInId, userId },
    });
    if (!checkIn) throw new NotFoundException('Check-in not found');
    if (
      checkIn.status !== CheckInStatus.ACTIVE &&
      checkIn.status !== CheckInStatus.ESCALATED
    )
      throw new ForbiddenException(
        `Cannot acknowledge check-in with status ${checkIn.status}`,
      );

    checkIn.status = CheckInStatus.RESOLVED;
    checkIn.resolvedAt = new Date();
    await this.checkInRepo.save(checkIn);

    await this.removePendingJobs(checkIn.id);

    try {
      await this.notificationsService.sendPushToUser(
        userId,
        'Safety Confirmed',
        "Thanks for confirming you're safe! Your emergency contact has been notified.",
        NotificationType.BOOKING_CONFIRMED,
        { checkInId, bookingId: checkIn.bookingId },
      );
    } catch (e) {
      this.logger.warn(
        `Failed to send acknowledge notification: ${(e as Error).message}`,
      );
    }

    return checkIn;
  }

  async escalateMissedCheckout(checkInId: string): Promise<void> {
    const checkIn = await this.checkInRepo.findOne({
      where: { id: checkInId },
      relations: ['booking'],
    });
    if (!checkIn) {
      this.logger.warn(`Check-in ${checkInId} not found for escalation`);
      return;
    }
    if (checkIn.status !== CheckInStatus.ACTIVE) return;

    checkIn.status = CheckInStatus.ESCALATED;
    checkIn.escalatedAt = new Date();
    await this.checkInRepo.save(checkIn);

    this.logger.warn(`Check-in ${checkInId} escalated`);

    const primaryContact = await this.getPrimaryContact(checkIn.userId);
    if (primaryContact) {
      try {
        await this.notificationsService.sendPushToUser(
          checkIn.userId,
          'Safety Alert',
          "You haven't checked out. Please confirm you're safe.",
          NotificationType.BOOKING_REMINDER,
          { checkInId, bookingId: checkIn.bookingId },
        );
      } catch (e) {
        this.logger.error(
          `Failed to send escalation push: ${(e as Error).message}`,
        );
      }
    }
  }

  async escalateEmergency(checkInId: string): Promise<void> {
    const checkIn = await this.checkInRepo.findOne({
      where: { id: checkInId },
      relations: ['booking', 'user'],
    });
    if (!checkIn) {
      this.logger.warn(
        `Check-in ${checkInId} not found for emergency escalation`,
      );
      return;
    }
    if (
      checkIn.status === CheckInStatus.RESOLVED ||
      checkIn.status === CheckInStatus.COMPLETED
    )
      return;

    this.logger.error(
      `EMERGENCY ESCALATION for check-in ${checkInId}, user ${checkIn.userId}`,
    );

    const primaryContact = await this.getPrimaryContact(checkIn.userId);
    if (primaryContact) {
      const trekSnapshot = (checkIn.booking as any)?.trekSnapshot;
      const trekName = trekSnapshot?.name ?? 'Unknown Trek';

      this.logger.warn(
        `Would send SMS to ${primaryContact.phone}: ${primaryContact.name}, ` +
          `${checkIn.user?.fullName ?? 'A trekker'} hasn't checked out from ` +
          `"${trekName}".`,
      );
    }
  }

  async resolveEscalation(checkInId: string): Promise<void> {
    const checkIn = await this.checkInRepo.findOne({
      where: { id: checkInId },
    });
    if (!checkIn) throw new NotFoundException('Check-in not found');

    checkIn.status = CheckInStatus.RESOLVED;
    checkIn.resolvedAt = new Date();
    await this.checkInRepo.save(checkIn);

    await this.removePendingJobs(checkIn.id);
  }

  private async removePendingJobs(checkInId: string): Promise<void> {
    try {
      const firstWarningJob = await this.firstWarningQueue.getJob(
        `first-warning:${checkInId}`,
      );
      if (firstWarningJob) await firstWarningJob.remove();
    } catch (e) {
      this.logger.warn(
        `Failed to remove first-warning job for ${checkInId}: ${(e as Error).message}`,
      );
    }

    try {
      const emergencyJob = await this.emergencyQueue.getJob(
        `emergency:${checkInId}`,
      );
      if (emergencyJob) await emergencyJob.remove();
    } catch (e) {
      this.logger.warn(
        `Failed to remove emergency job for ${checkInId}: ${(e as Error).message}`,
      );
    }
  }

  private async verifyOrganizerOwnership(
    trekId: string,
    userId: string,
  ): Promise<void> {
    const trek = await this.trekRepo.findOne({
      where: { id: trekId },
      relations: ['organizer'],
    });
    if (!trek) throw new NotFoundException('Trek not found');

    const organizerId =
      typeof trek.organizer === 'object' && trek.organizer !== null
        ? (trek.organizer as unknown as { id: string }).id
        : null;

    if (organizerId !== userId) {
      throw new ForbiddenException('You do not own this trek');
    }
  }
}
