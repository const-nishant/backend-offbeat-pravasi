import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payout, PayoutStatus } from './entities/payout.entity';

@Injectable()
export class AdminPayoutService {
  private readonly logger = new Logger(AdminPayoutService.name);

  constructor(
    @InjectRepository(Payout)
    private readonly repo: Repository<Payout>,
  ) {}

  async list(filters: {
    status?: PayoutStatus;
    organizerId?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) {
    const qb = this.repo.createQueryBuilder('p');
    if (filters.status) qb.andWhere('p.status = :status', { status: filters.status });
    if (filters.organizerId) qb.andWhere('p.organizerId = :organizerId', { organizerId: filters.organizerId });
    if (filters.from) qb.andWhere('p.createdAt >= :from', { from: new Date(filters.from) });
    if (filters.to) qb.andWhere('p.createdAt <= :to', { to: new Date(filters.to) });

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;

    const [data, total] = await qb
      .orderBy('p.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async approve(id: string) {
    const payout = await this.repo.findOne({ where: { id } });
    if (!payout) throw new NotFoundException('Payout not found');
    payout.status = PayoutStatus.APPROVED;
    await this.repo.save(payout);
    this.logger.log(`Approved payout: ${id}`);
    return payout;
  }

  async markSettled(id: string) {
    const payout = await this.repo.findOne({ where: { id } });
    if (!payout) throw new NotFoundException('Payout not found');
    payout.status = PayoutStatus.SETTLED;
    payout.settledAt = new Date();
    await this.repo.save(payout);
    this.logger.log(`Settled payout: ${id}`);
    return payout;
  }

  async summary() {
    const result = await this.repo
      .createQueryBuilder('p')
      .select([
        "COUNT(*) FILTER (WHERE p.status = 'PENDING') AS pending_count",
        "COALESCE(SUM(p.netAmount) FILTER (WHERE p.status = 'PENDING'), 0) AS pending_amount",
        "COUNT(*) FILTER (WHERE p.status = 'SETTLED' AND p.settledAt >= date_trunc('month', NOW())) AS paid_this_month",
        "COALESCE(SUM(p.netAmount) FILTER (WHERE p.status = 'SETTLED' AND p.settledAt >= date_trunc('month', NOW())), 0) AS paid_this_month_amount",
      ])
      .getRawOne();

    return {
      pendingCount: Number(result.pending_count ?? 0),
      pendingAmount: Number(result.pending_amount ?? 0),
      paidThisMonthCount: Number(result.paid_this_month ?? 0),
      paidThisMonthAmount: Number(result.paid_this_month_amount ?? 0),
    };
  }
}
