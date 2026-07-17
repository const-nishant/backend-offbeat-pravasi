import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataDeletionRequest } from './entities/data-deletion-request.entity';

@Injectable()
export class AdminDataDeletionService {
  private readonly logger = new Logger(AdminDataDeletionService.name);

  constructor(
    @InjectRepository(DataDeletionRequest)
    private readonly repo: Repository<DataDeletionRequest>,
  ) {}

  async list(page = 1, limit = 20) {
    const [data, total] = await this.repo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async approve(id: string, reviewedBy: string) {
    const req = await this.repo.findOne({ where: { id } });
    if (!req) throw new NotFoundException('Request not found');
    req.status = 'approved';
    req.reviewedBy = reviewedBy;
    req.processedAt = new Date();
    await this.repo.save(req);
    this.logger.log(`Approved data deletion: ${id}`);
    return req;
  }

  async reject(id: string, reason: string) {
    const req = await this.repo.findOne({ where: { id } });
    if (!req) throw new NotFoundException('Request not found');
    req.status = 'rejected';
    req.rejectionReason = reason;
    await this.repo.save(req);
    this.logger.log(`Rejected data deletion: ${id}`);
    return req;
  }
}
