import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request: Request = context.switchToHttp().getRequest();

    const headerName = process.env.API_KEY_HEADER?.toLowerCase() ?? 'x-api-key';

    const expectedKey = process.env.GLOBAL_API_KEY;

    if (!expectedKey) {
      // Allow all requests when no key is configured (dev mode)
      return true;
    }

    const provided =
      (request.headers[headerName] as string | undefined) ??
      (request.headers[headerName.toLowerCase()] as string | undefined) ??
      (request.headers[headerName.toUpperCase()] as string | undefined);

    if (!provided || provided !== expectedKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }
}
