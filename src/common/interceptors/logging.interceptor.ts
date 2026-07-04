import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Response } from 'express';
import { AuthenticatedUser } from '../decorators/current-user.decorator';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const startTime = Date.now();

    const httpContext = context.switchToHttp();
    const req = httpContext.getRequest<{
      user?: AuthenticatedUser;
      method: string;
      originalUrl: string;
      query: unknown;
    }>();
    const res = httpContext.getResponse<Response>();

    const user = req.user ?? null;
    const userId = user?.id ?? null;

    const { method, originalUrl, query } = req;

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;

          const log = {
            type: 'request',
            method,
            url: originalUrl,
            statusCode: res.statusCode,
            durationMs: duration,
            userId,
            query,
            timestamp: new Date().toISOString(),
          };

          this.logger.log(JSON.stringify(log));
        },

        error: (error: unknown) => {
          const duration = Date.now() - startTime;

          const message =
            error instanceof Error ? error.message : String(error);

          const log = {
            type: 'error',
            method,
            url: originalUrl,
            statusCode: res.statusCode,
            durationMs: duration,
            userId,
            query,
            message,
            timestamp: new Date().toISOString(),
          };

          this.logger.error(JSON.stringify(log));
        },
      }),
    );
  }
}
