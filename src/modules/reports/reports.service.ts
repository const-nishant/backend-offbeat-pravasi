import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report, ReportStatus } from './entities/report.entity';
import { CreateReportDto } from './dtos/create-report.dto';
import { User } from '../users/entities/user.entity';
import {
  getPagination,
  buildPaginationMeta,
} from '../../common/pagination/pagination.util';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepo: Repository<Report>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async create(userId: string, dto: CreateReportDto): Promise<Report> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const report = this.reportRepo.create({
      reporter: user,
      targetType: dto.targetType,
      targetId: dto.targetId,
      reason: dto.reason,
      description: dto.description,
      status: ReportStatus.PENDING,
    });

    return this.reportRepo.save(report);
  }

  async findPending(page = 1, limit = 20) {
    const { skip, take, page: p, limit: l } = getPagination({ page, limit });

    const [items, total] = await this.reportRepo.findAndCount({
      where: { status: ReportStatus.PENDING },
      relations: ['reporter'],
      order: { createdAt: 'DESC' },
      skip,
      take,
    });

    return { data: items, meta: buildPaginationMeta(p, l, total) };
  }

  async review(
    reportId: string,
    adminId: string,
    status:
      | ReportStatus.REVIEWED
      | ReportStatus.DISMISSED
      | ReportStatus.ACTION_TAKEN,
    adminNotes?: string,
  ): Promise<Report> {
    const report = await this.reportRepo.findOne({
      where: { id: reportId },
      relations: ['reporter'],
    });
    if (!report) throw new NotFoundException('Report not found');

    const admin = await this.userRepo.findOne({ where: { id: adminId } });
    if (!admin) throw new NotFoundException('Admin not found');

    report.status = status;
    report.reviewedBy = admin;
    report.adminNotes = adminNotes;
    report.reviewedAt = new Date();

    return this.reportRepo.save(report);
  }
}
