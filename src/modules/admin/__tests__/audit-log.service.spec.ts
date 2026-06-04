import { AuditLogService } from '../audit-log.service';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('AuditLogService', () => {
  let service: AuditLogService;
  const mockRepo: any = {
    create: jest.fn((e) => e),
    save: jest.fn(async (e) => ({ id: 'abc', ...e })),
    createQueryBuilder: jest.fn(() => ({
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(async () => [[{ id: '1' }], 1]),
      delete: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn(async () => ({ affected: 1 })),
    })),
  };

  beforeEach(() => {
    service = new AuditLogService(mockRepo as any);
  });

  it('saves an entry', async () => {
    const res = await service.save({ action: 'TEST' });
    expect(mockRepo.create).toHaveBeenCalled();
    expect(mockRepo.save).toHaveBeenCalled();
    expect(res.id).toBe('abc');
  });

  it('queries entries', async () => {
    const res = await service.query({}, { page: 1, limit: 10 });
    expect(res.data).toBeDefined();
    expect(res.total).toBe(1);
  });

  it('deletes older than date', async () => {
    const out = await service.deleteOlderThan(new Date().toISOString());
    expect(out).toBeDefined();
  });
});
