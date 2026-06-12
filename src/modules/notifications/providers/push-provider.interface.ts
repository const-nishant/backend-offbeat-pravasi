export interface PushPayload {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface SendResult {
  success: boolean;
  error?: string;
}

export interface IPushProvider {
  send(payload: PushPayload): Promise<SendResult>;
}
