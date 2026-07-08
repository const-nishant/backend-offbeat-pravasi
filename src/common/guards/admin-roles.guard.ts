import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ADMIN_ROLES_KEY } from '../decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';

type RequestWithUser = {
  user?: {
    isAdmin?: boolean;
    role?: AdminRole | null;
  };
};

@Injectable()
export class AdminRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AdminRole[]>(
      ADMIN_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const user = req.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (requiredRoles && requiredRoles.length > 0) {
      if (user.role && requiredRoles.includes(user.role)) {
        return true;
      }
      throw new ForbiddenException(
        `Requires one of roles: ${requiredRoles.join(', ')}`,
      );
    }

    if (!user.isAdmin && !user.role) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
