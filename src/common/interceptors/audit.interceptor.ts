import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogService } from '../../modules/admin/audit-log.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    const start = Date.now();
    return next.handle().pipe(
      tap(async (_res) => {
        // record simple audit entry for admin actions
        try {
          const action = `${req.method} ${req.route?.path || req.url}`;
          await this.auditService.save({
            actorId: user?.id,
            actorEmail: user?.email
              ? `${String(user.email).slice(0, 3)}***`
              : null,
            actorRole: user?.isAdmin ? 'ADMIN' : 'USER',
            action,
            resourceType: req.baseUrl || null,
            resourceId: req.params?.id || null,
            detail: { durationMs: Date.now() - start },
            ip: req.ip || req.headers['x-forwarded-for'] || null,
            userAgent: req.headers['user-agent'] || null,
          });
        } catch (_e) {
          // swallow errors to not affect request
          console.error(_e);
        }
      }),
    );
  }
}
