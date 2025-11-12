import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Redis, RedisOptions } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis;

  constructor() {
    const host = process.env.REDIS_HOST ?? '127.0.0.1';
    const port = Number(process.env.REDIS_PORT ?? '6379');
    const password = process.env.REDIS_PASSWORD || undefined;

    this.client = new (Redis as any as new (options: RedisOptions) => Redis)({
      host,
      port,
      password,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    });
  }

  async connect(): Promise<void> {
    if (
      (this.client as any).status === 'end' ||
      (this.client as any).status === 'wait'
    ) {
      this.client = this.client.duplicate();
    }

    if ((this.client as any).status !== 'ready') {
      await this.client.connect();
    }
  }

  getClient(): Redis {
    return this.client;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client && this.client.status !== 'end') {
      await this.client.quit();
    }
  }
}
