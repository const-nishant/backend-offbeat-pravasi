import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { OrganizerStatus } from 'src/modules/users/enums/organizer-status.enums';
import { CreateOrganizerRequestDto } from './create-organizer-request.dto';

export class UpdateOrganizerRequestDto extends PartialType(
  CreateOrganizerRequestDto,
) {
  @ApiProperty({ enum: OrganizerStatus, required: false })
  @IsOptional()
  @IsEnum(OrganizerStatus)
  status?: OrganizerStatus;

  @ApiProperty({ description: 'Admin notes', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  adminNotes?: string;

  @ApiProperty({ description: 'Whether organizer is active', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'When the application was reviewed',
    required: false,
    type: String,
  })
  @IsOptional()
  @IsDateString()
  reviewedAt?: string;
}
