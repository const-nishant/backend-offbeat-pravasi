export class ReferralCodeResponseDto {
  code!: string;
  shareLink!: string;
  tier!: string;
  totalReferrals!: number;
  successfulReferrals!: number;
  totalEarnedInr!: number;
}

export class ReferralResponseDto {
  id!: string;
  refereeEmail!: string;
  status!: string;
  rewardType!: string | null;
  rewardValueInr!: number | null;
  createdAt!: Date;
}

export class ReferralLeaderboardEntryDto {
  userId!: string;
  name!: string;
  successfulReferrals!: number;
}

export class ClaimReferralInfoDto {
  referrerName!: string;
  discountAmount!: number;
  code!: string;
}
