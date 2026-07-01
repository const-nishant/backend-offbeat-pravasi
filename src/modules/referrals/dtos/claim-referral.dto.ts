import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ClaimReferralDto {
  @ApiProperty()
  @IsString()
  @MaxLength(20)
  code!: string;
}
