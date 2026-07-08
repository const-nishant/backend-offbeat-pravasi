import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt, StrategyOptions } from 'passport-jwt';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { AdminRole } from '../../../modules/users/enums/admin-role.enum';

interface JwtPayload {
  sub: string;
  email: string;
  isAdmin: boolean;
  role?: AdminRole | null;
  organizerStatus?: string;
}

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is not set in environment variables');
    }

    const options: StrategyOptions = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
      ignoreExpiration: false,
    };

    super(options);
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    if (!payload?.sub) throw new UnauthorizedException('Invalid token');

    return {
      id: payload.sub,
      email: payload.email,
      isAdmin: payload.isAdmin,
      role: payload.role ?? null,
      organizerStatus: payload.organizerStatus,
    };
  }
}
