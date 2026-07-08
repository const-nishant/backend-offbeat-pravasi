import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import type { AdminRole } from '../../modules/users/enums/admin-role.enum';

export interface AuthenticatedUser {
  id: string;
  email: string;
  isAdmin: boolean;
  role?: AdminRole | null;
  organizerStatus?: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser | null => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    return request.user ?? null;
  },
);
