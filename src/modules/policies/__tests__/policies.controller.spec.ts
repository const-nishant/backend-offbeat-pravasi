import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { PoliciesController } from '../policies.controller';
import { PoliciesService } from '../policies.service';
import { Booking } from '../../bookings/entities/booking.entity';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('PoliciesController', () => {
  let controller: PoliciesController;
  let service: jest.Mocked<PoliciesService>;
  let bookingRepo: jest.Mocked<Repository<Booking>>;

  const mockPolicy = {
    id: 'policy-1',
    name: 'Standard',
    tiers: [],
  } as any;

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getDefault: jest.fn(),
      getForTrek: jest.fn(),
      assignToTrek: jest.fn(),
      createSnapshot: jest.fn(),
      calculateRefund: jest.fn(),
    } as any;

    bookingRepo = {
      findOne: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PoliciesController],
      providers: [
        { provide: PoliciesService, useValue: service },
        { provide: getRepositoryToken(Booking), useValue: bookingRepo },
      ],
    }).compile();

    controller = module.get(PoliciesController);
  });

  describe('findAll', () => {
    it('should return all policies', async () => {
      service.findAll.mockResolvedValue([mockPolicy]);
      const result = await controller.findAll();
      expect(result).toEqual([mockPolicy]);
    });
  });

  describe('create', () => {
    it('should create a policy', async () => {
      const dto = { name: 'Flexible', tiers: [] } as any;
      service.create.mockResolvedValue(mockPolicy);
      const result = await controller.create(dto);
      expect(result).toEqual(mockPolicy);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('should update a policy', async () => {
      const dto = { name: 'Updated' } as any;
      service.update.mockResolvedValue(mockPolicy);
      const result = await controller.update('policy-1', dto);
      expect(result).toEqual(mockPolicy);
      expect(service.update).toHaveBeenCalledWith('policy-1', dto);
    });
  });

  describe('delete', () => {
    it('should delete a policy and return deleted: true', async () => {
      service.delete.mockResolvedValue(undefined);
      const result = await controller.delete('policy-1');
      expect(result).toEqual({ deleted: true });
      expect(service.delete).toHaveBeenCalledWith('policy-1');
    });
  });

  describe('getForTrek', () => {
    it('should return policy for trek', async () => {
      service.getForTrek.mockResolvedValue(mockPolicy);
      const result = await controller.getForTrek('trek-1');
      expect(result).toEqual(mockPolicy);
      expect(service.getForTrek).toHaveBeenCalledWith('trek-1');
    });
  });

  describe('assignToTrek', () => {
    it('should assign policy to trek', async () => {
      service.assignToTrek.mockResolvedValue(undefined);
      const result = await controller.assignToTrek('trek-1', {
        policyId: 'policy-1',
      });
      expect(result).toEqual({ assigned: true });
      expect(service.assignToTrek).toHaveBeenCalledWith('trek-1', 'policy-1');
    });
  });

  describe('refundEstimate', () => {
    const mockBooking = {
      id: 'booking-1',
      userId: 'user-1',
      totalAmountInr: 2000,
      trekSnapshot: {
        startDate: new Date(Date.now() + 86400000 * 30).toISOString(),
      },
    } as any;

    it('should return refund estimate for booking owner', async () => {
      bookingRepo.findOne.mockResolvedValue(mockBooking);
      service.calculateRefund.mockResolvedValue({
        refundPercentage: 50,
        refundAmount: 1000,
        policyName: 'Standard',
      });

      const result = await controller.refundEstimate('booking-1', {
        id: 'user-1',
        email: '',
        isAdmin: false,
      } as any);

      expect(result).toEqual({
        refundPercentage: 50,
        refundAmount: 1000,
        policyName: 'Standard',
      });
    });

    it('should allow admin to get refund estimate', async () => {
      bookingRepo.findOne.mockResolvedValue(mockBooking);
      service.calculateRefund.mockResolvedValue({
        refundPercentage: 100,
        refundAmount: 2000,
        policyName: 'Standard',
      });

      const result = await controller.refundEstimate('booking-1', {
        id: 'admin-1',
        email: '',
        isAdmin: true,
      } as any);

      expect(result.refundPercentage).toBe(100);
    });

    it('should throw Forbidden for non-owner non-admin', async () => {
      bookingRepo.findOne.mockResolvedValue(mockBooking);

      await expect(
        controller.refundEstimate('booking-1', {
          id: 'stranger',
          email: '',
          isAdmin: false,
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when booking not found', async () => {
      bookingRepo.findOne.mockResolvedValue(null);

      await expect(
        controller.refundEstimate('bad-id', {
          id: 'user-1',
          email: '',
          isAdmin: false,
        } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
