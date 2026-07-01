import { IsArray, IsString, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class AnswerDto {
  @ApiProperty()
  @IsString()
  questionId!: string;

  @ApiProperty()
  @IsString()
  selectedOption!: string;
}

export class SubmitAssessmentDto {
  @ApiProperty({ type: [AnswerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers!: AnswerDto[];
}
