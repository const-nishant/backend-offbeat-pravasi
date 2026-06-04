import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum TrekDecision {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class TrekDecisionDto {
  @IsEnum(TrekDecision)
  decision!: TrekDecision;

  @IsOptional()
  @IsString()
  note?: string;
}
