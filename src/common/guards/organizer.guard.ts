import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class OrganizerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    const user = req.user as
      | { organizerStatus?: string; isAdmin?: boolean }
      | undefined;

    if (user?.isAdmin) return true; // Admin bypass

    if (user?.organizerStatus === 'APPROVED') return true;

    throw new ForbiddenException('Organizer access required');
  }
}
