import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  baseHealth() {
    return {
      success: true as const,
      message: 'Server running',
      data: {
        uptimeSeconds: process.uptime(),
        timestamp: new Date().toISOString(),
      },
    };
  }
}
