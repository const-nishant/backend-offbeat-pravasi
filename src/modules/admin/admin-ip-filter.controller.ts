import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  ParseUUIDPipe,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminIpFilterService } from './admin-ip-filter.service';
import { IpListType } from './entities/ip-access-rule.entity';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString } from 'class-validator';

class CreateIpRuleDto {
  @IsString()
  ipCidr!: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

class UpdateIpRuleDto {
  @IsOptional()
  @IsString()
  ipCidr?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;
}

@ApiTags('Admin / Security / IP Filter')
@Controller('admin/security')
@UseGuards(AuthGuard('jwt'), AdminRolesGuard)
export class AdminIpFilterController {
  constructor(private readonly adminIpFilterService: AdminIpFilterService) {}

  @Get('ip-blocklist')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'List all blocklist entries' })
  async listBlocklist() {
    return this.adminIpFilterService.list(IpListType.BLOCKLIST);
  }

  @Post('ip-blocklist')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Add IP to blocklist' })
  async addBlocklist(@Body() dto: CreateIpRuleDto) {
    return this.adminIpFilterService.create(IpListType.BLOCKLIST, {
      ipCidr: dto.ipCidr,
      reason: dto.reason,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });
  }

  @Patch('ip-blocklist/:id')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Update a blocklist entry' })
  async updateBlocklist(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIpRuleDto,
  ) {
    return this.adminIpFilterService.update(id, {
      ipCidr: dto.ipCidr,
      reason: dto.reason,
      expiresAt:
        dto.expiresAt !== undefined
          ? dto.expiresAt
            ? new Date(dto.expiresAt)
            : null
          : undefined,
    });
  }

  @Delete('ip-blocklist/:id')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Remove IP from blocklist' })
  async deleteBlocklist(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminIpFilterService.delete(id);
  }

  @Get('ip-allowlist')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'List all allowlist entries' })
  async listAllowlist() {
    return this.adminIpFilterService.list(IpListType.ALLOWLIST);
  }

  @Post('ip-allowlist')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Add IP to allowlist' })
  async addAllowlist(@Body() dto: CreateIpRuleDto) {
    return this.adminIpFilterService.create(IpListType.ALLOWLIST, {
      ipCidr: dto.ipCidr,
      reason: dto.reason,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });
  }

  @Patch('ip-allowlist/:id')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Update an allowlist entry' })
  async updateAllowlist(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIpRuleDto,
  ) {
    return this.adminIpFilterService.update(id, {
      ipCidr: dto.ipCidr,
      reason: dto.reason,
      expiresAt:
        dto.expiresAt !== undefined
          ? dto.expiresAt
            ? new Date(dto.expiresAt)
            : null
          : undefined,
    });
  }

  @Delete('ip-allowlist/:id')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Remove IP from allowlist' })
  async deleteAllowlist(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminIpFilterService.delete(id);
  }

  @Get('ip-blocklist/audit')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'View blocklist hit audit log' })
  async getBlocklistAudit() {
    return this.adminIpFilterService.getAudit(IpListType.BLOCKLIST);
  }
}
