import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt, StrategyOptions } from 'passport-jwt';
import { Request } from 'express';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';

interface RefreshPayload {
  sub: string;
  email: string;
  isAdmin: boolean;
  organizerStatus?: string;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor() {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET is not set in environment variables');
    }

    const options: StrategyOptions = {
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request): string | null =>
          req.cookies?.refresh_token as string | null,
      ]),
      secretOrKey: secret,
      ignoreExpiration: false,
      passReqToCallback: true,
    };

    super(options);
  }

  validate(req: Request, payload: RefreshPayload): AuthenticatedUser {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) throw new UnauthorizedException('Refresh token missing');

    return {
      id: payload.sub,
      email: payload.email,
      isAdmin: payload.isAdmin,
      organizerStatus: payload.organizerStatus,
    };
  }
}
