import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminTask, TaskStatus, TaskPriority } from './entities/admin-task.entity';

@Injectable()
export class AdminTaskService {
  private readonly logger = new Logger(AdminTaskService.name);

  constructor(
    @InjectRepository(AdminTask)
    private readonly repo: Repository<AdminTask>,
  ) {}

  async create(data: {
    type: string;
    resourceType?: string;
    resourceId?: string;
    assignedTo?: string;
    priority?: TaskPriority;
    dueBy?: Date;
  }) {
    const task = this.repo.create(data);
    const saved = await this.repo.save(task);
    this.logger.log(`Created task ${saved.id}: ${data.type}`);
    return saved;
  }

  async assign(id: string, assignedTo: string) {
    const task = await this.repo.findOne({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    task.assignedTo = assignedTo;
    return this.repo.save(task);
  }

  async updateStatus(id: string, status: TaskStatus) {
    const task = await this.repo.findOne({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    task.status = status;
    if (status === TaskStatus.RESOLVED || status === TaskStatus.CLOSED) {
      task.resolvedAt = new Date();
    }
    return this.repo.save(task);
  }

  async list(filters: {
    assignedTo?: string;
    status?: TaskStatus;
    type?: string;
    priority?: TaskPriority;
    page?: number;
    limit?: number;
  }) {
    const qb = this.repo.createQueryBuilder('t');
    if (filters.assignedTo) qb.andWhere('t.assignedTo = :assignedTo', { assignedTo: filters.assignedTo });
    if (filters.status) qb.andWhere('t.status = :status', { status: filters.status });
    if (filters.type) qb.andWhere('t.type = :type', { type: filters.type });
    if (filters.priority) qb.andWhere('t.priority = :priority', { priority: filters.priority });

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const [data, total] = await qb
      .orderBy('t.priority', 'DESC')
      .addOrderBy('t.createdAt', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async mine(adminId: string) {
    return this.repo.find({
      where: { assignedTo: adminId, status: TaskStatus.OPEN },
      order: { priority: 'DESC', dueBy: 'ASC' },
    });
  }
}
