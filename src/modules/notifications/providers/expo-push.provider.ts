import { Injectable, Logger } from '@nestjs/common';
import type {
  IPushProvider,
  PushPayload,
  SendResult,
} from './push-provider.interface';

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';

@Injectable()
export class ExpoPushProvider implements IPushProvider {
  private readonly logger = new Logger(ExpoPushProvider.name);

  async send(payload: PushPayload): Promise<SendResult> {
    try {
      const response = await fetch(EXPO_PUSH_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.EXPO_ACCESS_TOKEN
            ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` }
            : {}),
        },
        body: JSON.stringify({
          to: payload.to,
          title: payload.title,
          body: payload.body,
          data: payload.data ?? {},
        }),
      });

      const result = (await response.json()) as {
        data?: Array<{ status: string; message?: string }>;
        errors?: Array<{ message: string }>;
      };

      if (!response.ok) {
        const msg = result.errors?.[0]?.message ?? `HTTP ${response.status}`;
        return { success: false, error: msg };
      }

      const ticket = result.data?.[0];
      if (ticket?.status === 'error') {
        return { success: false, error: ticket.message ?? 'Expo push error' };
      }

      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Expo push send failed: ${msg}`);
      return { success: false, error: msg };
    }
  }
}
