import { NotFoundException } from '@nestjs/common';
import { OrganizerController } from './organizer.controller';
import type { OrganizerService } from './organizer.service';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('OrganizerController', () => {
  let controller: OrganizerController;
  let organizerService: jest.Mocked<
    Pick<OrganizerService, 'getApplicationById'>
  >;

  beforeEach(() => {
    organizerService = {
      getApplicationById: jest.fn(),
    };

    controller = new OrganizerController(
      organizerService as unknown as OrganizerService,
    );
  });

  it('throws not found when admin fetches a missing application', async () => {
    organizerService.getApplicationById.mockResolvedValue(null);

    await expect(controller.getApplication('missing-id')).rejects.toThrow(
      new NotFoundException('Application not found'),
    );
  });
});
