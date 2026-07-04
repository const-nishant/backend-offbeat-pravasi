import { IsString, IsEnum, IsOptional, Min, MinLength } from 'class-validator';

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
  @MinLength(10)
  reason!: string;
}
