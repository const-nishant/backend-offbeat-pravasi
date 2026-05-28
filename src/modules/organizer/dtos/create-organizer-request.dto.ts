import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Min,
} from 'class-validator';

export class CreateOrganizerRequestDto {
  @ApiProperty({ description: 'Name of the organization', maxLength: 160 })
  @IsString()
  @IsNotEmpty()
  @Length(1, 160)
  organizationName: string;

  @ApiProperty({
    description: 'Contact person name',
    maxLength: 160,
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 160)
  contactPerson?: string;

  @ApiProperty({ description: 'Contact phone number', maxLength: 20 })
  @IsString()
  @IsNotEmpty()
  @Length(3, 20)
  contactPhone: string;

  @ApiProperty({ description: 'Website URL', maxLength: 160, required: false })
  @IsOptional()
  @IsUrl()
  @Length(1, 160)
  website?: string;

  @ApiProperty({ description: 'Short bio about the organization' })
  @IsString()
  @IsNotEmpty()
  bio: string;

  @ApiProperty({
    description: 'Years of experience',
    required: false,
    example: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  yearsOfExperience?: number;

  @ApiProperty({
    description: 'Document URLs map',
    required: false,
    type: Object,
    example: { licence: 'https://...' },
  })
  @IsOptional()
  @IsObject()
  documentUrls?: Record<string, string>;

  @ApiProperty({
    description: 'Certificate URLs map',
    required: false,
    type: Object,
    example: { certificate: 'https://...' },
  })
  @IsOptional()
  @IsObject()
  certificateUrls?: Record<string, string>;
}
