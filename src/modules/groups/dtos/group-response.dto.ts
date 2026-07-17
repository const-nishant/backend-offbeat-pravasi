class GroupMemberDto {
  id!: string;
  groupId!: string;
  userId!: string | null;
  email!: string;
  status!: string;
  fullName!: string | null;
  phone!: string | null;
  medicalConditions!: string | null;
  joinedAt!: Date | null;
  createdAt!: Date;
}

export class GroupDetailDto {
  id!: string;
  trekId!: string;
  leadUserId!: string;
  name!: string;
  maxSize!: number;
  expiresAt!: Date;
  status!: string;
  shareCode!: string;
  createdAt!: Date;
  updatedAt!: Date;
  members!: GroupMemberDto[];
}
