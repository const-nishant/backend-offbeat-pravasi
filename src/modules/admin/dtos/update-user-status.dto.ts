import { IsOptional, IsBoolean, IsString } from 'class-validator';
import { OrganizerStatus } from '../../users/enums/organizer-status.enums';

export class UpdateUserStatusDto {
  @IsOptional()
  @IsBoolean()
  isSuspended?: boolean;

  @IsOptional()
  @IsString()
  organizerStatus?: OrganizerStatus | string;

  @IsOptional()
  @IsString()
  note?: string;
}
