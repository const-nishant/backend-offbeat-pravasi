import { Test, type TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { TicketService } from '../ticket.service';
import { UnauthorizedException } from '@nestjs/common';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('TicketService', () => {
  let service: TicketService;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketService,
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TicketService>(TicketService);
    jwtService = module.get(JwtService);
  });

  describe('generateSignedTicket', () => {
    it('should generate a signed ticket token', async () => {
      const payload = { bookingId: 'booking-1', userId: 'user-1' };
      jwtService.signAsync.mockResolvedValue('signed-token');

      const result = await service.generateSignedTicket(payload, 60);

      expect(result.token).toBe('signed-token');
      expect(result.issuedAt).toBeDefined();
      expect(result.expiresAt).toBeGreaterThan(result.issuedAt);
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingId: 'booking-1',
          userId: 'user-1',
          v: 1,
        }),
        { expiresIn: '60m' },
      );
    });

    it('should use default TTL of 1440 minutes', async () => {
      jwtService.signAsync.mockResolvedValue('default-ttl-token');

      await service.generateSignedTicket({
        bookingId: 'booking-1',
        userId: 'user-1',
      });

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.any(Object),
        { expiresIn: '1440m' },
      );
    });
  });

  describe('verifyToken', () => {
    it('should verify and return decoded payload', async () => {
      const decoded = { bookingId: 'booking-1', userId: 'user-1' };
      jwtService.verifyAsync.mockResolvedValue(decoded);

      const result = await service.verifyToken('valid-token');

      expect(result).toEqual(decoded);
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(service.verifyToken('bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
