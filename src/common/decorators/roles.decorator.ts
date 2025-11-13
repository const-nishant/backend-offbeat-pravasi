import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles' as const;

export type AppRole = 'admin' | 'organizer';

export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
