import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssessmentsController } from './assessments.controller';
import { AssessmentsService } from './assessments.service';
import { FitnessAssessment } from './entities/fitness-assessment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FitnessAssessment])],
  controllers: [AssessmentsController],
  providers: [AssessmentsService],
  exports: [AssessmentsService],
})
export class AssessmentsModule {}
