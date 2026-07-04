import { IsString, IsInt, IsOptional, Min, Max } from 'class-validator';

export class AdminRefundDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  amount?: number;

  @IsString()
  reason: string;
}
