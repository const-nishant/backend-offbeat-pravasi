import { DataSource } from 'typeorm';
import { ormConfig } from './config/ormconfig';

export const AppDataSource = new DataSource(ormConfig);
