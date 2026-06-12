import { IsUUID, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentProvider } from '../../bookings/entities/payment.entity';

export class CreateCheckoutDto {
  @IsUUID()
  bookingId!: string;

  @IsEnum(PaymentProvider)
  provider!: PaymentProvider;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
