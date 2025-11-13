import { DataSourceOptions } from 'typeorm';
import { User } from '../modules/users/entities/user.entity';
// Import all other entities here when created…

export const ormConfig: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'offbeat_pravasi',

  // Always turn OFF synchronize in production
  synchronize: process.env.TYPEORM_SYNC === 'true',

  // Auto-load all entity files
  entities: [
    User,
    // Add new entities here as you build modules
  ],

  migrations: ['dist/database/migrations/*.js'],
  migrationsTableName: 'migrations',

  ssl:
    process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,

  logging: process.env.DB_LOGGING === 'true',
};
