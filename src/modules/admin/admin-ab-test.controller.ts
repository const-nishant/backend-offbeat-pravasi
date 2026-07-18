import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminAbTestService } from './admin-ab-test.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsDateString,
  ValidateNested,
  ArrayMinSize,
  Min,
  Max,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Type } from 'class-transformer';

@ValidatorConstraint({ name: 'variantsSum', async: false })
class VariantsSumConstraint implements ValidatorConstraintInterface {
  validate(
    variants: { name: string; percentage: number }[],
    _args: ValidationArguments,
  ) {
    if (!Array.isArray(variants)) return true;
    const sum = variants.reduce(
      (acc, v) => acc + (Number(v?.percentage) || 0),
      0,
    );
    return Math.round(sum) === 100;
  }

  defaultMessage() {
    return 'variant percentages must sum to exactly 100';
  }
}

@ValidatorConstraint({ name: 'endDateAfterStart', async: false })
class EndDateAfterStartConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments) {
    const obj = args.object as CreateAbTestDto;
    if (!obj.startDate || !obj.endDate) return true;
    return new Date(obj.endDate).getTime() >= new Date(obj.startDate).getTime();
  }

  defaultMessage() {
    return 'endDate must be on or after startDate';
  }
}

class VariantDto {
  @IsString()
  name!: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  percentage!: number;
}

class CreateAbTestDto {
  @IsString()
  key!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Validate(VariantsSumConstraint)
  @Type(() => VariantDto)
  variants!: VariantDto[];

  @IsOptional()
  @IsString()
  audienceSegment?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  @Validate(EndDateAfterStartConstraint)
  endDate?: string;
}

class ConcludeDto {
  @IsString()
  winnerVariant!: string;
}

@ApiTags('Admin / A/B Tests')
@Controller('admin/ab-tests')
@UseGuards(AuthGuard('jwt'), AdminRolesGuard)
export class AdminAbTestController {
  constructor(private readonly adminAbTestService: AdminAbTestService) {}

  @Get()
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'List A/B tests' })
  async list() {
    return this.adminAbTestService.list();
  }

  @Post()
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Create an A/B test' })
  async create(@Body() dto: CreateAbTestDto) {
    return this.adminAbTestService.create({
      ...dto,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
    });
  }

  @Get(':id/results')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Get A/B test results' })
  async results(@Param('id') id: string) {
    return this.adminAbTestService.results(id);
  }

  @Post(':id/conclude')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Conclude A/B test with winner' })
  async conclude(@Param('id') id: string, @Body() dto: ConcludeDto) {
    return this.adminAbTestService.conclude(id, dto.winnerVariant);
  }
}
