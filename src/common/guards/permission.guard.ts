import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { PERMISSIONS } from '../constants/permissions';
import type { Permission } from '../constants/permissions';

type RequestWithUser = {
  user?: {
    role?: string | null;
  };
};

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.getAllAndOverride<Permission>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermission) return true;

    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const role = req.user?.role;

    if (!role) {
      throw new ForbiddenException('Authentication required');
    }

    const allowedRoles = PERMISSIONS[requiredPermission];
    if (!allowedRoles?.includes(role as any)) {
      throw new ForbiddenException(
        `Requires permission: ${requiredPermission}`,
      );
    }

    return true;
  }
}
