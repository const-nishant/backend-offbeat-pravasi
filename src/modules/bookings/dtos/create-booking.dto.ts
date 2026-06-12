import {
  IsUUID,
  IsInt,
  Min,
  IsOptional,
  IsArray,
  IsEmail,
  IsString,
} from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  trekId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsArray()
  participants?: Array<any>;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  clientReference?: string;
}
