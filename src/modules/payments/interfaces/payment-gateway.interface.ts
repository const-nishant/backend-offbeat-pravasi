export interface RefundResult {
  providerRefundId: string;
  status: string;
}

export interface PaymentGateway {
  createPaymentIntent(
    amountInr: number,
    idempotencyKey?: string,
  ): Promise<{ providerPaymentId: string; rawResponse: any }>;
  refundPayment(
    providerPaymentId: string,
    amount?: number,
  ): Promise<RefundResult>;
  getDisputes(): Promise<any[]>;
  supportsProvider(provider: string): boolean;
}
