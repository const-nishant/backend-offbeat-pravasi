import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type {
  IPushProvider,
  PushPayload,
  SendResult,
} from './push-provider.interface';
import type {
  PushSubscription,
  SendResult as WebPushSendResult,
} from 'web-push';

interface WebPushMethods {
  setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
  sendNotification(
    subscription: PushSubscription,
    payload: string,
  ): Promise<WebPushSendResult>;
}

let webPushModule: WebPushMethods | undefined;

function loadWebPush() {
  try {
    const wp: WebPushMethods = require('web-push');
    webPushModule = wp;
  } catch {
    webPushModule = undefined;
  }
}

@Injectable()
export class WebPushProvider implements IPushProvider, OnModuleInit {
  private readonly logger = new Logger(WebPushProvider.name);
  private vapidConfigured = false;

  onModuleInit(): void {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject =
      process.env.VAPID_SUBJECT ?? 'mailto:hello@offbeatpravasi.com';

    if (!publicKey || !privateKey) {
      this.logger.warn('VAPID keys not set; Web Push disabled');
      return;
    }

    loadWebPush();

    if (!webPushModule) {
      this.logger.warn('web-push package not loaded; Web Push disabled');
      return;
    }

    webPushModule.setVapidDetails(subject, publicKey, privateKey);
    this.vapidConfigured = true;
    this.logger.log('Web Push (VAPID) configured');
  }

  async send(payload: PushPayload): Promise<SendResult> {
    const wp = webPushModule;
    if (!this.vapidConfigured || !wp) {
      return { success: false, error: 'Web Push not configured' };
    }

    try {
      const subscription = JSON.parse(payload.to) as PushSubscription;
      await wp.sendNotification(
        subscription,
        JSON.stringify({
          title: payload.title,
          body: payload.body,
          data: payload.data ?? {},
        }),
      );
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Web Push send failed: ${msg}`);
      return { success: false, error: msg };
    }
  }
}
