import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  async save(entry: Partial<AuditLog>) {
    const ent = this.repo.create(entry as AuditLog);
    return this.repo.save(ent);
  }

  async query(filters: any, options: { page?: number; limit?: number } = {}) {
    const qb = this.repo.createQueryBuilder('a');
    if (filters.actorId)
      qb.andWhere('a.actorId = :actorId', { actorId: filters.actorId });
    if (filters.action)
      qb.andWhere('a.action ILIKE :action', { action: `%${filters.action}%` });
    if (filters.resourceType)
      qb.andWhere('a.resourceType = :rt', { rt: filters.resourceType });
    if (filters.from)
      qb.andWhere('a.createdAt >= :from', { from: filters.from });
    if (filters.to) qb.andWhere('a.createdAt <= :to', { to: filters.to });

    qb.orderBy('a.createdAt', 'DESC');

    const page = options.page || 1;
    const limit = options.limit || 20;
    qb.skip((page - 1) * limit).take(limit);
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async deleteOlderThan(date: string | Date) {
    return this.repo
      .createQueryBuilder()
      .delete()
      .where('createdAt < :d', { d: date })
      .execute();
  }
}
