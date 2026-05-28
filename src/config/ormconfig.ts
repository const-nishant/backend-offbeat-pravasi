import type { DataSourceOptions } from 'typeorm';
import { User } from '../modules/users/entities/user.entity';
import { Trek } from '../modules/treks/entities/trek.entity';
import { TrekImage } from '../modules/treks/entities/trek-image.entity';
import { TrekTag } from '../modules/treks/entities/trek-tag.entity';
import { TrekReview } from '../modules/treks/entities/trek-review.entity';
import { TrekInteraction } from '../modules/treks/entities/trek-interaction.entity';

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
  entities: [User, Trek, TrekImage, TrekTag, TrekReview, TrekInteraction],

  // Support both compiled JS (dist) and TS (src) migrations so migrations
  // run in dev (ts-node) and production (compiled). Add PostGIS migration below.
  migrations: ['dist/database/migrations/*.js', 'src/database/migrations/*.ts'],
  migrationsTableName: 'migrations',

  ssl:
    process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,

  logging: process.env.DB_LOGGING === 'true',
};
