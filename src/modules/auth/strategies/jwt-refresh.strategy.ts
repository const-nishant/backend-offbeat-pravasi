import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt, StrategyOptions } from 'passport-jwt';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { AdminRole } from '../../../modules/users/enums/admin-role.enum';

interface RefreshPayload {
  sub: string;
  email: string;
  isAdmin: boolean;
  role?: AdminRole | null;
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
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      secretOrKey: secret,
      ignoreExpiration: false,
    };

    super(options);
  }

  validate(payload: RefreshPayload): AuthenticatedUser {
    return {
      id: payload.sub,
      email: payload.email,
      isAdmin: payload.isAdmin,
      role: payload.role ?? null,
      organizerStatus: payload.organizerStatus,
    };
  }
}
