import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import { UpsertOnboardingDto } from './dtos/onboarding.dto';
import { SearchUsersDto } from './dtos/search-users.dto';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    const profile = await this.usersService.getProfile(user.id);
    return { data: profile };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    const profile = await this.usersService.updateProfile(user.id, dto);
    return { data: profile };
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/onboarding')
  @ApiOperation({ summary: 'Save onboarding answers' })
  async saveOnboarding(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertOnboardingDto,
  ) {
    return this.usersService.saveOnboarding(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('search')
  @ApiOperation({ summary: 'Search users by username or name' })
  async search(@Query() dto: SearchUsersDto) {
    return this.usersService.search(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  async findById(@Param('id') id: string) {
    const profile = await this.usersService.findById(id);
    return { data: profile };
  }
}
