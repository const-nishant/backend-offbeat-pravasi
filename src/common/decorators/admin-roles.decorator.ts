import { SetMetadata } from '@nestjs/common';
import type { AdminRole } from '../../modules/users/enums/admin-role.enum';

export const ADMIN_ROLES_KEY = 'admin_roles';

export const AdminRoles = (...roles: AdminRole[]) =>
  SetMetadata(ADMIN_ROLES_KEY, roles);
