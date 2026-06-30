import { IsIn, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MemberStatus } from '../enums/member-status.enum';

export class UpdateMemberStatusDto {
  @ApiProperty({ enum: [MemberStatus.JOINED, MemberStatus.DECLINED] })
  @IsString()
  @IsIn([MemberStatus.JOINED, MemberStatus.DECLINED])
  status!: MemberStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  medicalConditions?: string;
}
