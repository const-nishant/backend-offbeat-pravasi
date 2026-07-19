import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class AdminMigrationService {
  private readonly logger = new Logger(AdminMigrationService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async list() {
    const rows = await this.dataSource.query(
      `SELECT
         id,
         timestamp,
         name
       FROM migrations
       ORDER BY timestamp DESC`,
    );

    return rows.map((r: any) => ({
      id: r.id,
      timestamp: r.timestamp,
      name: r.name,
      state: 'up',
    }));
  }
}
