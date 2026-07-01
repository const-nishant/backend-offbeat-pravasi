import { ApiProperty } from '@nestjs/swagger';

class GroupMemberDto {
  @ApiProperty() id!: string;
  @ApiProperty() groupId!: string;
  @ApiProperty({ nullable: true }) userId!: string | null;
  @ApiProperty() email!: string;
  @ApiProperty() status!: string;
  @ApiProperty({ nullable: true }) fullName!: string | null;
  @ApiProperty({ nullable: true }) phone!: string | null;
  @ApiProperty({ nullable: true }) medicalConditions!: string | null;
  @ApiProperty({ nullable: true }) joinedAt!: Date | null;
  @ApiProperty() createdAt!: Date;
}

export class GroupDetailDto {
  @ApiProperty() id!: string;
  @ApiProperty() trekId!: string;
  @ApiProperty() leadUserId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() maxSize!: number;
  @ApiProperty() expiresAt!: Date;
  @ApiProperty() status!: string;
  @ApiProperty() shareCode!: string;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiProperty({ type: [GroupMemberDto] })
  members!: GroupMemberDto[];
}
