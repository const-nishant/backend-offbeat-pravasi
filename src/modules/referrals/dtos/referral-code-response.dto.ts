import { ApiProperty } from '@nestjs/swagger';

export class ReferralCodeResponseDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  shareLink!: string;

  @ApiProperty()
  tier!: string;

  @ApiProperty()
  totalReferrals!: number;

  @ApiProperty()
  successfulReferrals!: number;

  @ApiProperty()
  totalEarnedInr!: number;
}

export class ReferralResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  refereeEmail!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty({ nullable: true })
  rewardType!: string | null;

  @ApiProperty({ nullable: true })
  rewardValueInr!: number | null;

  @ApiProperty()
  createdAt!: Date;
}

export class ReferralLeaderboardEntryDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  successfulReferrals!: number;
}

export class ClaimReferralInfoDto {
  @ApiProperty()
  referrerName!: string;

  @ApiProperty()
  discountAmount!: number;

  @ApiProperty()
  code!: string;
}
