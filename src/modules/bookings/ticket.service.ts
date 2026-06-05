import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class TicketService {
  constructor(private readonly jwtService: JwtService) {}

  async generateSignedTicket(
    payload: { bookingId: string; userId: string },
    ttlMinutes = 1440,
  ) {
    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAt = issuedAt + ttlMinutes * 60;
    const token = await this.jwtService.signAsync(
      { ...payload, iat: issuedAt, exp: expiresAt, v: 1 },
      { expiresIn: `${ttlMinutes}m` },
    );
    return { token, issuedAt, expiresAt };
  }
}
