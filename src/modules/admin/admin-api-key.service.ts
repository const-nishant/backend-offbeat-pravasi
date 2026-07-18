import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes } from 'node:crypto';
import { ApiKey } from './entities/api-key.entity';

@Injectable()
export class AdminApiKeyService {
  private readonly logger = new Logger(AdminApiKeyService.name);

  constructor(
    @InjectRepository(ApiKey)
    private readonly repo: Repository<ApiKey>,
  ) {}

  private hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }

  private generateKey(): string {
    return `op_${randomBytes(24).toString('hex')}`;
  }

  async list() {
    return this.repo.find({
      order: { createdAt: 'DESC' },
      select: [
        'id',
        'name',
        'permissions',
        'expiresAt',
        'lastUsedAt',
        'isActive',
        'createdAt',
      ],
    });
  }

  async get(id: string) {
    const key = await this.repo.findOne({
      where: { id },
      select: [
        'id',
        'name',
        'permissions',
        'expiresAt',
        'lastUsedAt',
        'isActive',
        'createdAt',
        'updatedAt',
      ],
    });
    if (!key) throw new NotFoundException('API key not found');
    return key;
  }

  async create(data: {
    name: string;
    permissions?: string[];
    expiresAt?: Date;
  }) {
    const rawKey = this.generateKey();
    const keyHash = this.hashKey(rawKey);

    const entity = this.repo.create({
      keyHash,
      name: data.name,
      permissions: data.permissions ?? [],
      expiresAt: data.expiresAt ?? null,
    });

    await this.repo.save(entity);

    this.logger.log(`Created API key: ${data.name}`);

    return {
      id: entity.id,
      name: entity.name,
      key: rawKey,
      permissions: entity.permissions,
      expiresAt: entity.expiresAt,
      createdAt: entity.createdAt,
    };
  }

  async update(
    id: string,
    data: { name?: string; permissions?: string[]; expiresAt?: Date | null },
  ) {
    const key = await this.repo.findOne({ where: { id } });
    if (!key) throw new NotFoundException('API key not found');

    if (data.name !== undefined) key.name = data.name;
    if (data.permissions !== undefined) key.permissions = data.permissions;
    if (data.expiresAt !== undefined) key.expiresAt = data.expiresAt;

    const saved = await this.repo.save(key);
    return saved;
  }

  async revoke(id: string) {
    const key = await this.repo.findOne({ where: { id } });
    if (!key) throw new NotFoundException('API key not found');

    key.isActive = false;
    await this.repo.save(key);
    this.logger.log(`Revoked API key: ${key.name}`);
    return { success: true };
  }

  async rotate(id: string) {
    const key = await this.repo.findOne({ where: { id } });
    if (!key) throw new NotFoundException('API key not found');

    const rawKey = this.generateKey();
    const keyHash = this.hashKey(rawKey);

    key.keyHash = keyHash;
    key.lastUsedAt = null;
    await this.repo.save(key);

    this.logger.log(`Rotated API key: ${key.name}`);

    return {
      id: key.id,
      name: key.name,
      key: rawKey,
    };
  }
}
