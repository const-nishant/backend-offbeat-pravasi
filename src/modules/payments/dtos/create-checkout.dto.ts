import { IsUUID, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentProviderEnum } from '../enums/payment-provider.enum';

export class CreateCheckoutDto {
  @IsUUID()
  bookingId!: string;

  @IsEnum(PaymentProviderEnum)
  provider!: PaymentProviderEnum;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
