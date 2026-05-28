import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

type RequestWithUser = {
  user?: { organizerStatus?: string; isAdmin?: boolean };
};

@Injectable()
export class OrganizerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const user = req.user;

    if (user?.isAdmin) return true; // Admin bypass

    if (user?.organizerStatus === 'APPROVED') return true;

    throw new ForbiddenException('Organizer access required');
  }
}
