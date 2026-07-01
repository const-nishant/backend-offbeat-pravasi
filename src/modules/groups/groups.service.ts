import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Not, Repository } from 'typeorm';
import { randomBytes } from 'node:crypto';
import { TrekGroup } from './entities/trek-group.entity';
import { GroupMember } from './entities/group-member.entity';
import { Trek } from '../treks/entities/trek.entity';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { GroupStatus } from './enums/group-status.enum';
import { MemberStatus } from './enums/member-status.enum';
import { CreateGroupDto } from './dtos/create-group.dto';
import { InviteMembersDto } from './dtos/invite-members.dto';
import { UpdateGroupDto } from './dtos/update-group.dto';
import { UpdateMemberStatusDto } from './dtos/update-member-status.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';

@Injectable()
export class GroupsService {
  private readonly logger = new Logger(GroupsService.name);

  constructor(
    @InjectRepository(TrekGroup)
    private readonly groupRepo: Repository<TrekGroup>,
    @InjectRepository(GroupMember)
    private readonly memberRepo: Repository<GroupMember>,
    @InjectRepository(Trek)
    private readonly trekRepo: Repository<Trek>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateGroupDto): Promise<TrekGroup> {
    const trek = await this.trekRepo.findOne({ where: { id: dto.trekId } });
    if (!trek) throw new NotFoundException('Trek not found');

    const name = dto.name ?? `${trek.name} Group`;
    const shareCode = this.generateShareCode();

    const group = this.groupRepo.create({
      trekId: dto.trekId,
      leadUserId: userId,
      name,
      maxSize: dto.maxSize,
      expiresAt: new Date(dto.expiresAt),
      shareCode,
    });

    const saved = await this.groupRepo.save(group);

    this.logger.log(
      `Group ${saved.id} created by user ${userId} for trek ${dto.trekId}`,
    );

    return saved;
  }

  async getById(groupId: string, userId: string): Promise<TrekGroup> {
    const group = await this.groupRepo.findOne({
      where: { id: groupId },
      relations: ['members'],
    });
    if (!group) throw new NotFoundException('Group not found');

    const isMember =
      group.leadUserId === userId ||
      group.members?.some((m) => m.userId === userId);
    if (!isMember) throw new ForbiddenException('Not a member of this group');

    return group;
  }

  async update(
    groupId: string,
    userId: string,
    dto: UpdateGroupDto,
  ): Promise<TrekGroup> {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');
    if (group.leadUserId !== userId)
      throw new ForbiddenException('Only the lead can update the group');
    if (group.status !== GroupStatus.OPEN)
      throw new BadRequestException('Group is no longer open');

    if (dto.name !== undefined) group.name = dto.name;
    if (dto.maxSize !== undefined) {
      if (
        dto.maxSize <
        (await this.memberRepo.count({
          where: { groupId, status: MemberStatus.JOINED },
        }))
      ) {
        throw new BadRequestException(
          'maxSize cannot be less than current joined members',
        );
      }
      group.maxSize = dto.maxSize;
    }
    if (dto.expiresAt !== undefined) group.expiresAt = new Date(dto.expiresAt);

    return this.groupRepo.save(group);
  }

  async invite(
    groupId: string,
    userId: string,
    dto: InviteMembersDto,
  ): Promise<GroupMember[]> {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');
    if (group.leadUserId !== userId)
      throw new ForbiddenException('Only the lead can invite members');
    if (group.status !== GroupStatus.OPEN)
      throw new BadRequestException('Group is no longer open');

    const currentCount = await this.memberRepo.count({
      where: { groupId, status: Not(In([MemberStatus.DECLINED])) },
    });

    if (currentCount + dto.invites.length > group.maxSize) {
      throw new BadRequestException('Invite would exceed group maxSize');
    }

    const created: GroupMember[] = [];
    for (const invite of dto.invites) {
      const existing = await this.memberRepo.findOne({
        where: { groupId, email: invite.email },
      });
      if (existing) {
        if (existing.status === MemberStatus.DECLINED) {
          existing.status = MemberStatus.INVITED;
          await this.memberRepo.save(existing);
          created.push(existing);
        }
        continue;
      }

      const member = this.memberRepo.create({
        groupId,
        email: invite.email,
      });
      const saved = await this.memberRepo.save(member);
      created.push(saved);
    }

    return created;
  }

  async join(
    shareCode: string,
    userId: string,
    email: string,
  ): Promise<GroupMember> {
    const group = await this.groupRepo.findOne({ where: { shareCode } });
    if (!group) throw new NotFoundException('Invalid share code');
    if (group.status !== GroupStatus.OPEN)
      throw new BadRequestException('Group is no longer open');
    if (group.expiresAt < new Date())
      throw new BadRequestException('Group has expired');

    let member = await this.memberRepo.findOne({
      where: { groupId: group.id, email },
    });

    if (!member) {
      member = await this.memberRepo.findOne({
        where: { groupId: group.id, userId },
      });
    }

    if (!member)
      throw new NotFoundException('No invitation found for this email');
    if (member.status === MemberStatus.DECLINED)
      throw new BadRequestException('Invitation was declined');
    if (member.status === MemberStatus.JOINED)
      throw new BadRequestException('Already joined');

    member.userId = userId;
    member.status = MemberStatus.JOINED;
    member.joinedAt = new Date();

    return this.memberRepo.save(member);
  }

  async updateMemberStatus(
    groupId: string,
    memberId: string,
    userId: string,
    dto: UpdateMemberStatusDto,
  ): Promise<GroupMember> {
    const member = await this.memberRepo.findOne({
      where: { id: memberId, groupId },
    });
    if (!member) throw new NotFoundException('Member not found');
    if (member.userId !== userId)
      throw new ForbiddenException('Can only update your own status');

    member.status = dto.status;
    if (dto.fullName !== undefined) member.fullName = dto.fullName;
    if (dto.phone !== undefined) member.phone = dto.phone;
    if (dto.medicalConditions !== undefined)
      member.medicalConditions = dto.medicalConditions;
    if (dto.status === MemberStatus.JOINED) member.joinedAt = new Date();

    return this.memberRepo.save(member);
  }

  async removeMember(
    groupId: string,
    memberId: string,
    userId: string,
  ): Promise<void> {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');
    if (group.leadUserId !== userId)
      throw new ForbiddenException('Only the lead can remove members');

    const member = await this.memberRepo.findOne({
      where: { id: memberId, groupId },
    });
    if (!member) throw new NotFoundException('Member not found');

    await this.memberRepo.remove(member);
  }

  async bookForGroup(groupId: string, userId: string): Promise<Booking> {
    const group = await this.groupRepo.findOne({
      where: { id: groupId },
      relations: ['members'],
    });
    if (!group) throw new NotFoundException('Group not found');
    if (group.leadUserId !== userId)
      throw new ForbiddenException('Only the lead can book');
    if (group.status !== GroupStatus.OPEN)
      throw new BadRequestException('Group is no longer open');
    if (group.expiresAt < new Date())
      throw new BadRequestException('Group has expired');

    const joinedMembers =
      group.members?.filter((m) => m.status === MemberStatus.JOINED) ?? [];

    if (joinedMembers.length === 0) {
      throw new BadRequestException('No members have joined the group');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const trek = await queryRunner.manager
        .createQueryBuilder(Trek, 'trek')
        .setLock('pessimistic_write')
        .where('trek.id = :id', { id: group.trekId })
        .getOne();

      if (!trek) throw new NotFoundException('Trek not found');

      const reserved = await queryRunner.manager
        .createQueryBuilder(Booking, 'booking')
        .where('booking.trekId = :trekId', { trekId: group.trekId })
        .andWhere('booking.status IN (:...statuses)', {
          statuses: ['CONFIRMED', 'PENDING'],
        })
        .select('COALESCE(SUM(booking.quantity), 0)', 'reserved')
        .getRawOne<{ reserved: number }>();

      const reservedSeats = Number(reserved?.reserved ?? 0);
      const groupSize = joinedMembers.length;

      if (reservedSeats + groupSize > trek.maxParticipants) {
        throw new BadRequestException('Not enough available seats');
      }

      const unitPrice = trek.costInr;
      const participants = joinedMembers.map((m) => ({
        userId: m.userId,
        email: m.email,
        fullName: m.fullName,
        phone: m.phone,
        emergencyContact: m.emergencyContact,
        medicalConditions: m.medicalConditions,
      }));

      const booking = queryRunner.manager.create(Booking, {
        trekId: group.trekId,
        userId: group.leadUserId,
        participants,
        quantity: groupSize,
        unitPriceInr: unitPrice,
        totalAmountInr: unitPrice * groupSize,
        status: BookingStatus.PENDING,
        trekSnapshot: {
          name: trek.name,
          organizerId: (trek as any).organizerId,
          maxParticipants: trek.maxParticipants,
          startDate: (trek as any).startDate,
          unitPriceInr: unitPrice,
        },
        metadata: { groupId: group.id },
      } as any);

      const savedBooking = await queryRunner.manager.save(Booking, booking);

      await queryRunner.manager.update(Trek, group.trekId, {
        currentParticipants: () => `currentParticipants + ${groupSize}`,
      });

      await queryRunner.manager.update(TrekGroup, group.id, {
        status: GroupStatus.BOOKED,
      });

      await queryRunner.commitTransaction();

      this.logger.log(
        `Group ${groupId} booked: booking ${savedBooking.id}, ${groupSize} members, total ₹${unitPrice * groupSize}`,
      );

      for (const member of joinedMembers) {
        if (member.userId) {
          await this.notificationsService
            .sendPushToUser(
              member.userId,
              'Group Booking Confirmed',
              `Your group "${group.name}" has been booked for ${trek.name}`,
              NotificationType.BOOKING_CONFIRMED,
              { bookingId: savedBooking.id, groupId: group.id },
            )
            .catch((err) =>
              this.logger.warn(
                `Notification failed for ${member.userId}: ${err.message}`,
              ),
            );
        }
      }

      return savedBooking;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async cancel(groupId: string, userId: string): Promise<void> {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');
    if (group.leadUserId !== userId)
      throw new ForbiddenException('Only the lead can cancel');

    group.status = GroupStatus.CANCELLED;
    await this.groupRepo.save(group);

    const members = await this.memberRepo.find({ where: { groupId } });
    for (const member of members) {
      if (member.userId) {
        await this.notificationsService
          .sendPushToUser(
            member.userId,
            'Group Cancelled',
            `Group "${group.name}" has been cancelled by the lead`,
            NotificationType.GROUP_UPDATE,
            { groupId: group.id },
          )
          .catch((err) =>
            this.logger.warn(`Notification failed: ${err.message}`),
          );
      }
    }
  }

  async expireStaleGroups(): Promise<number> {
    const expired = await this.groupRepo
      .createQueryBuilder()
      .update(TrekGroup)
      .set({ status: GroupStatus.EXPIRED })
      .where('status = :status', { status: GroupStatus.OPEN })
      .andWhere('expiresAt < NOW()')
      .returning('id')
      .execute();

    const count = expired.affected ?? 0;
    if (count > 0) {
      this.logger.log(`Expired ${count} stale groups`);
    }
    return count;
  }

  private generateShareCode(): string {
    return randomBytes(6).toString('hex').toUpperCase().slice(0, 12);
  }
}
