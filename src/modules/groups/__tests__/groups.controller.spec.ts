import { Test, type TestingModule } from '@nestjs/testing';
import { GroupsController } from '../groups.controller';
import { GroupsService } from '../groups.service';
import { GroupStatus } from '../enums/group-status.enum';

describe('GroupsController', () => {
  let controller: GroupsController;
  let service: jest.Mocked<GroupsService>;

  const mockUser = { id: 'user-1', email: 'user@test.com', isAdmin: false };
  const mockGroup = {
    id: 'group-1',
    trekId: 'trek-1',
    leadUserId: 'user-1',
    name: 'Test Group',
    maxSize: 5,
    expiresAt: new Date('2099-12-31'),
    status: GroupStatus.OPEN,
    shareCode: 'ABC123',
    createdAt: new Date(),
    updatedAt: new Date(),
    members: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GroupsController],
      providers: [
        {
          provide: GroupsService,
          useValue: {
            create: jest.fn(),
            getById: jest.fn(),
            update: jest.fn(),
            invite: jest.fn(),
            join: jest.fn(),
            updateMemberStatus: jest.fn(),
            removeMember: jest.fn(),
            bookForGroup: jest.fn(),
            cancel: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<GroupsController>(GroupsController);
    service = module.get(GroupsService);
  });

  it('POST /groups — create', async () => {
    service.create.mockResolvedValue(mockGroup as any);
    const result = await controller.create(mockUser as any, {
      trekId: 'trek-1',
      maxSize: 5,
      expiresAt: '2099-12-31T00:00:00Z',
    });
    expect(result).toEqual(mockGroup);
    expect(service.create).toHaveBeenCalledWith('user-1', expect.any(Object));
  });

  it('GET /groups/:id — getById', async () => {
    service.getById.mockResolvedValue(mockGroup as any);
    const result = await controller.getById(mockUser as any, 'group-1');
    expect(result).toEqual(mockGroup);
  });

  it('PATCH /groups/:id — update', async () => {
    service.update.mockResolvedValue(mockGroup as any);
    const result = await controller.update(mockUser as any, 'group-1', {
      name: 'Updated',
    });
    expect(result).toEqual(mockGroup);
  });

  it('POST /groups/:id/invite — invite', async () => {
    service.invite.mockResolvedValue([]);
    await controller.invite(mockUser as any, 'group-1', {
      invites: [{ email: 'a@b.com' }],
    });
    expect(service.invite).toHaveBeenCalledWith(
      'group-1',
      'user-1',
      expect.any(Object),
    );
  });

  it('POST /groups/join/:shareCode — join', async () => {
    service.join.mockResolvedValue({} as any);
    await controller.join(mockUser as any, 'ABC123');
    expect(service.join).toHaveBeenCalledWith(
      'ABC123',
      'user-1',
      'user@test.com',
    );
  });

  it('PATCH /groups/:id/members/:memberId/status — updateMemberStatus', async () => {
    service.updateMemberStatus.mockResolvedValue({} as any);
    await controller.updateMemberStatus(
      mockUser as any,
      'group-1',
      'member-1',
      {
        status: 'JOINED' as any,
      },
    );
    expect(service.updateMemberStatus).toHaveBeenCalledWith(
      'group-1',
      'member-1',
      'user-1',
      expect.any(Object),
    );
  });

  it('DELETE /groups/:id/members/:memberId — removeMember', async () => {
    await controller.removeMember(mockUser as any, 'group-1', 'member-1');
    expect(service.removeMember).toHaveBeenCalledWith(
      'group-1',
      'member-1',
      'user-1',
    );
  });

  it('POST /groups/:id/book — book', async () => {
    service.bookForGroup.mockResolvedValue({} as any);
    await controller.book(mockUser as any, 'group-1');
    expect(service.bookForGroup).toHaveBeenCalledWith('group-1', 'user-1');
  });

  it('DELETE /groups/:id — cancel', async () => {
    await controller.cancel(mockUser as any, 'group-1');
    expect(service.cancel).toHaveBeenCalledWith('group-1', 'user-1');
  });
});
