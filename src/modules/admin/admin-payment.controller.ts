import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AdminPaymentService } from './admin-payment.service';
import { AdminPaymentQueryDto } from './dtos/admin-payment-query.dto';
import { AdminRefundDto } from './dtos/admin-refund.dto';
import { AdminRetryPaymentDto } from './dtos/admin-retry-payment.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Admin / Payments')
@Controller('admin/payments')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminPaymentController {
  constructor(private readonly adminPaymentService: AdminPaymentService) {}

  @Get()
  @ApiOperation({ summary: 'Search payment transactions' })
  async searchPayments(@Query() q: AdminPaymentQueryDto) {
    return this.adminPaymentService.searchPayments(q);
  }

  @Post(':id/refund')
  @ApiOperation({ summary: 'Full or partial refund with reason' })
  async refundPayment(
    @Param('id') id: string,
    @Body() body: AdminRefundDto,
    @Req() req: any,
  ) {
    return this.adminPaymentService.refundPayment(id, body, req.user, req);
  }

  @Post(':id/retry')
  @ApiOperation({ summary: 'Retry failed payment on a different provider' })
  async retryPayment(
    @Param('id') id: string,
    @Body() body: AdminRetryPaymentDto,
    @Req() req: any,
  ) {
    return this.adminPaymentService.retryPayment(id, body, req.user, req);
  }

  @Get('disputes')
  @ApiOperation({ summary: 'List payment disputes' })
  async getDisputes() {
    return this.adminPaymentService.getDisputes();
  }
}
