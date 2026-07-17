import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

interface SuccessResponse<T> {
  success: true;
  message: string;
  data: T;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, SuccessResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<SuccessResponse<T>> {
    return next.handle().pipe(
      map((data: T): SuccessResponse<T> => {
        if (
          data &&
          typeof data === 'object' &&
          'success' in (data as Record<string, unknown>)
        ) {
          return data as unknown as SuccessResponse<T>;
        }

        const defaultMessage = 'Request successful';

        return {
          success: true,
          message: defaultMessage,
          data: data,
        };
      }),
    );
  }
}
