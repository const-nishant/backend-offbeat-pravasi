import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { TrekTag } from '../treks/entities/trek-tag.entity';
import { TrekCategory } from './entities/trek-category.entity';
import { Trek } from '../treks/entities/trek.entity';

@Injectable()
export class AdminTagService {
  private readonly logger = new Logger(AdminTagService.name);

  constructor(
    @InjectRepository(TrekTag)
    private readonly tagRepo: Repository<TrekTag>,
    @InjectRepository(TrekCategory)
    private readonly catRepo: Repository<TrekCategory>,
    @InjectRepository(Trek)
    private readonly trekRepo: Repository<Trek>,
  ) {}

  async listTags() {
    return this.tagRepo.find({ order: { name: 'ASC' } });
  }

  async createTag(name: string) {
    const tag = this.tagRepo.create({ name });
    const saved = await this.tagRepo.save(tag);
    this.logger.log(`Created tag: ${name}`);
    return saved;
  }

  async deleteTag(id: string) {
    const tag = await this.tagRepo.findOne({ where: { id } });
    if (!tag) throw new NotFoundException('Tag not found');
    await this.tagRepo.remove(tag);
    return { success: true };
  }

  async listCategories() {
    return this.catRepo.find({ order: { sortOrder: 'ASC', name: 'ASC' } });
  }

  async createCategory(data: {
    name: string;
    slug: string;
    parentId?: string;
    sortOrder?: number;
    description?: string;
  }) {
    const cat = this.catRepo.create({
      name: data.name,
      slug: data.slug,
      parentId: data.parentId ?? null,
      sortOrder: data.sortOrder ?? 0,
      description: data.description ?? null,
    });
    const saved = await this.catRepo.save(cat);
    this.logger.log(`Created category: ${data.name}`);
    return saved;
  }

  async updateCategory(
    id: string,
    data: {
      name?: string;
      slug?: string;
      parentId?: string | null;
      sortOrder?: number;
      description?: string | null;
    },
  ) {
    const cat = await this.catRepo.findOne({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');

    if (data.name !== undefined) cat.name = data.name;
    if (data.slug !== undefined) cat.slug = data.slug;
    if (data.parentId !== undefined) cat.parentId = data.parentId;
    if (data.sortOrder !== undefined) cat.sortOrder = data.sortOrder;
    if (data.description !== undefined) cat.description = data.description;

    return this.catRepo.save(cat);
  }

  async deleteCategory(id: string) {
    const cat = await this.catRepo.findOne({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');
    await this.catRepo.remove(cat);
    return { success: true };
  }

  async updateTrekTags(trekId: string, tagIds: string[]) {
    const trek = await this.trekRepo.findOne({
      where: { id: trekId },
      relations: ['tags'],
    });
    if (!trek) throw new NotFoundException('Trek not found');

    const tags = await this.tagRepo.findBy({ id: In(tagIds) });

    trek.tags = tags;
    await this.trekRepo.save(trek);
    this.logger.log(`Updated tags for trek ${trekId}`);
    return { success: true };
  }
}
