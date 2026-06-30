import { AdminService } from '../admin.service';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('AdminService', () => {
  let service: AdminService;
  const mockAudit = { save: jest.fn(async (e) => ({ id: 'a', ...e })) } as any;
  const mockUserRepo: any = {
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(async () => [[{ id: 'u1' }], 1]),
    })),
    findOne: jest.fn(async ({ where: { id } }) =>
      id === 'exists' ? { id: 'exists', isSuspended: false } : null,
    ),
    save: jest.fn(async (u) => u),
  };

  const mockOrganizerService = {
    updateApplication: jest.fn(async (id, dto) => ({ id, dto })),
  } as any;

  const mockAppRepo: any = {
    save: jest.fn(async (e) => e),
    findOne: jest.fn(),
  };
  const mockTrekRepo: any = { find: jest.fn() };
  const mockBookingRepo: any = { find: jest.fn() };
  const mockPlatformSettingsService: any = {
    getByKey: jest.fn(),
    setByKey: jest.fn(),
  };
  const mockTicketPdfWorker: any = { generate: jest.fn() };
  const mockNotificationsService: any = {};
  const mockMailerService: any = {
    sendTrekPublishedEmail: jest.fn(),
    sendTrekRejectedEmail: jest.fn(),
  };
  const mockReferralCodeRepo: any = {
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(async () => [[], 0]),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(async () => []),
    })),
  };
  const mockReferralRepo: any = {
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(async () => [[], 0]),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(async () => []),
    })),
  };

  beforeEach(() => {
    service = new AdminService(
      mockAudit,
      mockUserRepo,
      mockAppRepo,
      mockTrekRepo,
      mockBookingRepo,
      mockOrganizerService,
      mockPlatformSettingsService,
      mockTicketPdfWorker,
      mockNotificationsService,
      mockMailerService,
      mockReferralCodeRepo,
      mockReferralRepo,
    );
  });

  it('lists users', async () => {
    const res = await service.listUsers({ query: 'x' }, 1, 10);
    expect(res.total).toBe(1);
    expect(mockUserRepo.createQueryBuilder).toHaveBeenCalled();
  });

  it('updateUserStatus - not found', async () => {
    await expect(
      service.updateUserStatus(
        'missing',
        { isSuspended: true },
        { id: 'admin' },
        {},
      ),
    ).rejects.toThrow();
  });

  it('updateUserStatus - success', async () => {
    const out = await service.updateUserStatus(
      'exists',
      { isSuspended: true },
      { id: 'admin' },
      {},
    );
    expect(out.isSuspended).toBe(true);
  });

  it('decideOrganizerRequest', async () => {
    const out = await service.decideOrganizerRequest(
      'app1',
      { decision: 'APPROVE', note: 'ok' },
      { id: 'admin' },
      {},
    );
    expect(mockOrganizerService.updateApplication).toHaveBeenCalled();
    expect(out.id).toBe('app1');
  });
});
