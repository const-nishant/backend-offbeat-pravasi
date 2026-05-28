import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/modules/users/entities/user.entity';
import { OrganizerStatus } from 'src/modules/users/enums/organizer-status.enums';
import { FindOptionsWhere, Repository } from 'typeorm';
import { CreateOrganizerRequestDto } from './dtos/create-organizer-request.dto';
import { UpdateOrganizerRequestDto } from './dtos/update-organizer-request.dto';
import { OrganizerApplication } from './entities/organizer-application.entity';

@Injectable()
export class OrganizerService {
  constructor(
    @InjectRepository(OrganizerApplication)
    private readonly applicationRepo: Repository<OrganizerApplication>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /** Create a new organizer application for a user */
  public async createApplication(
    userId: string,
    dto: CreateOrganizerRequestDto,
  ): Promise<OrganizerApplication> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const existingWhere: FindOptionsWhere<OrganizerApplication> = {
      user: { id: userId },
      status: OrganizerStatus.PENDING,
    };

    const existing = await this.applicationRepo.findOne({
      where: existingWhere,
      relations: ['user'],
    });

    if (existing) {
      throw new ConflictException('An application is already pending');
    }

    const app = this.applicationRepo.create({
      ...dto,
      user,
      status: OrganizerStatus.PENDING,
    });

    const saved = await this.applicationRepo.save(app);

    // mark user's organizer status as PENDING when they submit an application
    user.organizerStatus = OrganizerStatus.PENDING;
    user.isOrganizerActive = false;
    await this.userRepo.save(user);

    return saved;
  }

  /** Update an existing application (admin review flow) */
  public async updateApplication(
    applicationId: string,
    dto: UpdateOrganizerRequestDto,
  ): Promise<OrganizerApplication> {
    const app = await this.applicationRepo.findOne({
      where: { id: applicationId },
      relations: ['user'],
    });

    if (!app) throw new NotFoundException('Application not found');

    if (dto.adminNotes !== undefined) app.adminNotes = dto.adminNotes;
    if (dto.status !== undefined) app.status = dto.status;

    if (dto.reviewedAt !== undefined) {
      app.reviewedAt = new Date(dto.reviewedAt);
    } else if (
      dto.status === OrganizerStatus.APPROVED ||
      dto.status === OrganizerStatus.REJECTED
    ) {
      app.reviewedAt = new Date();
    }

    await this.applicationRepo.save(app);

    const user = app.user;
    if (!user) return app;

    // If admin supplied a status, reflect it on the user
    if (dto.status !== undefined) {
      user.organizerStatus = dto.status;

      if (dto.status === OrganizerStatus.APPROVED) {
        user.isOrganizerActive = true;
        if (user.organizerRating == null) user.organizerRating = 0;
      } else {
        // REJECTED or PENDING -> not active
        user.isOrganizerActive = false;
      }

      await this.userRepo.save(user);
    }

    return app;
  }

  /** Get application by id */
  public async getApplicationById(
    id: string,
  ): Promise<OrganizerApplication | null> {
    return this.applicationRepo.findOne({ where: { id }, relations: ['user'] });
  }

  /** Get latest application for a user (if any) */
  public async getMyApplication(
    userId: string,
  ): Promise<OrganizerApplication | null> {
    return this.applicationRepo.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
      order: { submittedAt: 'DESC' },
    });
  }
}
