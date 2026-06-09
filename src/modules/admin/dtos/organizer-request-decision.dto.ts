import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum Decision {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class OrganizerRequestDecisionDto {
  @IsEnum(Decision)
  decision!: Decision;

  @IsOptional()
  @IsString()
  note?: string;
}
