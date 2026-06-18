import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReportStatus } from '../entities/report.entity';

export class ReviewReportDto {
  @ApiProperty({
    enum: [
      ReportStatus.REVIEWED,
      ReportStatus.DISMISSED,
      ReportStatus.ACTION_TAKEN,
    ],
  })
  @IsEnum(ReportStatus)
  status!:
    | ReportStatus.REVIEWED
    | ReportStatus.DISMISSED
    | ReportStatus.ACTION_TAKEN;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  adminNotes?: string;
}
