import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AssessmentsService } from './assessments.service';
import { SubmitAssessmentDto } from './dtos/submit-assessment.dto';
import {
  AssessmentResultDto,
  PublicBracketDto,
} from './dtos/assessment-result.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';

@ApiTags('Assessments')
@Controller()
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Public()
  @Get('assessments/questions')
  @ApiOperation({ summary: 'Get quiz questions and options' })
  @ApiOkResponse({ description: 'Returns the quiz question bank' })
  async getQuestions() {
    return this.assessmentsService.getQuestions();
  }

  @UseGuards(JwtAuthGuard)
  @Post('assessments/submit')
  @ApiOperation({ summary: 'Submit quiz answers and get score + bracket' })
  @ApiOkResponse({ type: AssessmentResultDto })
  async submit(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitAssessmentDto,
  ): Promise<AssessmentResultDto> {
    return this.assessmentsService.submit(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('assessments/my-result')
  @ApiOperation({ summary: 'Get latest assessment result for current user' })
  @ApiOkResponse({ type: AssessmentResultDto, nullable: true })
  async getMyResult(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AssessmentResultDto | null> {
    return this.assessmentsService.getLatestResult(user.id);
  }

  @Public()
  @Get('users/:userId/assessment-result')
  @ApiOperation({ summary: 'Get a user public assessment bracket' })
  @ApiOkResponse({ type: PublicBracketDto })
  async getUserBracket(
    @Param('userId') userId: string,
  ): Promise<{ difficultyBracket: string | null }> {
    return this.assessmentsService.getPublicBracket(userId);
  }
}
