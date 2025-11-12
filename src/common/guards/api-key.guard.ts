import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly apiKey: string;
  private readonly headerName: string;

  constructor() {
    const key = process.env.GLOBAL_API_KEY ?? '';
    if (!key) {
      throw new Error('GLOBAL_API_KEY is not configured');
    }
    this.apiKey = key;

    const header = process.env.API_KEY_HEADER ?? 'x-api-key';
    this.headerName = header.trim() !== '' ? header.toLowerCase() : 'x-api-key';
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.headers[this.headerName] as string | undefined;

    if (!provided || provided !== this.apiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }
}
