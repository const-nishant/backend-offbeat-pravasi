import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeatureFlag } from './entities/feature-flag.entity';

@Injectable()
export class AdminAbTestService {
  private readonly logger = new Logger(AdminAbTestService.name);

  constructor(
    @InjectRepository(FeatureFlag)
    private readonly repo: Repository<FeatureFlag>,
  ) {}

  async list() {
    return this.repo.find({
      order: { createdAt: 'DESC' },
    });
  }

  async create(data: {
    key: string;
    description?: string;
    variants: { name: string; percentage: number }[];
    audienceSegment?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const existing = await this.repo.findOne({ where: { key: data.key } });
    if (existing) {
      throw new ConflictException(
        `A/B test with key "${data.key}" already exists`,
      );
    }

    const test = this.repo.create({
      key: data.key,
      description: JSON.stringify({
        type: 'ab_test',
        variants: data.variants,
        audienceSegment: data.audienceSegment ?? null,
        startDate: data.startDate?.toISOString() ?? null,
        endDate: data.endDate?.toISOString() ?? null,
      }),
      enabled: true,
      percentage: 100,
      userSegment: data.audienceSegment ?? null,
    });
    const saved = await this.repo.save(test);
    this.logger.log(`Created A/B test: ${data.key}`);
    return saved;
  }

  async conclude(id: string, winnerVariant: string) {
    const test = await this.repo.findOne({ where: { id } });
    if (!test) throw new NotFoundException('A/B test not found');

    const desc = test.description ? JSON.parse(test.description) : {};
    const variants: { name: string }[] = desc.variants ?? [];
    if (
      variants.length > 0 &&
      !variants.some((v) => v.name === winnerVariant)
    ) {
      throw new BadRequestException(
        `winnerVariant "${winnerVariant}" is not one of the test variants`,
      );
    }

    desc.winner = winnerVariant;
    desc.concludedAt = new Date().toISOString();
    test.description = JSON.stringify(desc);
    const saved = await this.repo.save(test);
    this.logger.log(`Concluded A/B test ${id}, winner: ${winnerVariant}`);
    return saved;
  }

  async results(id: string) {
    const test = await this.repo.findOne({ where: { id } });
    if (!test) throw new NotFoundException('A/B test not found');
    const desc = test.description ? JSON.parse(test.description) : {};
    return {
      id: test.id,
      key: test.key,
      variants: desc.variants ?? [],
      winner: desc.winner ?? null,
      concludedAt: desc.concludedAt ?? null,
      enabled: test.enabled,
      createdAt: test.createdAt,
    };
  }
}
