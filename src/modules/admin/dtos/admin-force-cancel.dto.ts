import { IsString, IsEnum, IsOptional, Min } from 'class-validator';

export enum ForceCancelRefund {
  FULL = 'FULL',
  PARTIAL = 'PARTIAL',
  NONE = 'NONE',
}

export class AdminForceCancelDto {
  @IsEnum(ForceCancelRefund)
  refundOverride!: ForceCancelRefund;

  @IsOptional()
  @IsString()
  refundNote?: string;

  @IsString()
  @Min(10)
  reason!: string;
}
