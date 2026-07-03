import { IsEnum, IsString } from 'class-validator';
import { PaymentProvider } from '../../bookings/entities/payment.entity';

export class AdminRetryPaymentDto {
  @IsEnum(PaymentProvider)
  provider: PaymentProvider;

  @IsString()
  idempotencyKey: string;
}
