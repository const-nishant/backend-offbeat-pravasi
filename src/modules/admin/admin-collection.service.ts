import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrekCollection } from './entities/trek-collection.entity';

@Injectable()
export class AdminCollectionService {
  private readonly logger = new Logger(AdminCollectionService.name);

  constructor(
    @InjectRepository(TrekCollection)
    private readonly repo: Repository<TrekCollection>,
  ) {}

  async list() {
    const collections = await this.repo.find({ order: { name: 'ASC' } });
    return collections.map((c) => ({
      ...c,
      trekCount: c.trekIds.length,
    }));
  }

  async create(data: {
    name: string;
    slug: string;
    description?: string;
    trekIds?: string[];
    coverImage?: string;
  }) {
    const existing = await this.repo.findOne({ where: { slug: data.slug } });
    if (existing) throw new ConflictException('Slug already exists');

    const collection = this.repo.create({
      name: data.name,
      slug: data.slug,
      description: data.description ?? null,
      trekIds: data.trekIds ?? [],
      coverImage: data.coverImage ?? null,
    });
    const saved = await this.repo.save(collection);
    this.logger.log(`Created collection: ${data.name}`);
    return saved;
  }

  async updateTreks(id: string, trekIds: string[]) {
    const collection = await this.repo.findOne({ where: { id } });
    if (!collection) throw new NotFoundException('Collection not found');
    collection.trekIds = trekIds;
    return this.repo.save(collection);
  }
}
