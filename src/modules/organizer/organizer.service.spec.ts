import { ConflictException } from '@nestjs/common';
import { OrganizerStatus } from 'src/modules/users/enums/organizer-status.enums';
import { OrganizerService } from './organizer.service';

describe('OrganizerService', () => {
  let service: OrganizerService;
  let applicationRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let userRepo: {
    findOne: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(() => {
    applicationRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    userRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const mailerService = {
      sendOrganizerApplicationReceivedEmail: jest.fn(),
      sendOrganizerApprovedEmail: jest.fn(),
      sendOrganizerRejectedEmail: jest.fn(),
    } as never;

    service = new OrganizerService(
      applicationRepo as never,
      userRepo as never,
      mailerService,
      null as never,
      null as never,
      null as never,
      null as never,
      null as never,
    );
  });

  it('looks up pending applications with a typed nested user condition', async () => {
    const user = { id: 'user-1' };
    const dto = {
      organizationName: 'Offbeat Pravasi',
      contactPhone: '1234567890',
      bio: 'Bio',
    };
    const createdApp = { ...dto, user, status: OrganizerStatus.PENDING };
    const savedApp = { id: 'app-1', ...createdApp };

    userRepo.findOne.mockResolvedValue(user);
    applicationRepo.findOne.mockResolvedValue(null);
    applicationRepo.create.mockReturnValue(createdApp);
    applicationRepo.save.mockResolvedValue(savedApp);
    userRepo.save.mockResolvedValue({
      ...user,
      organizerStatus: OrganizerStatus.PENDING,
      isOrganizerActive: false,
    });

    await expect(service.createApplication(user.id, dto)).resolves.toEqual(
      savedApp,
    );

    expect(applicationRepo.findOne).toHaveBeenCalledWith({
      where: {
        user: { id: user.id },
        status: OrganizerStatus.PENDING,
      },
      relations: ['user'],
    });
  });

  it('still blocks duplicate pending applications', async () => {
    const user = { id: 'user-1' };
    const dto = {
      organizationName: 'Offbeat Pravasi',
      contactPhone: '1234567890',
      bio: 'Bio',
    };

    userRepo.findOne.mockResolvedValue(user);
    applicationRepo.findOne.mockResolvedValue({
      id: 'existing-app',
      status: OrganizerStatus.PENDING,
    });

    await expect(service.createApplication(user.id, dto)).rejects.toThrow(
      new ConflictException('An application is already pending'),
    );
  });
});
