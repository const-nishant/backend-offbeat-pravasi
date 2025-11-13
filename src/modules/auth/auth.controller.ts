import { Controller, Post, Body, UseGuards, Get, Req } from '@nestjs/common';
import { AuthService, TokenPair } from './auth.service';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { SendOtpDto } from './dtos/send-otp.dto';
import { VerifyOtpDto } from './dtos/verify-otp.dto';
import { RefreshDto } from './dtos/refresh.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';

interface RequestWithSession extends Request {
  sessionId?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // -------------------------------
  // REGISTER
  // -------------------------------
  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // -------------------------------
  // LOGIN
  // -------------------------------
  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto): Promise<{
    success: true;
    message: string;
    data: TokenPair;
  }> {
    const tokens = await this.authService.login(dto);
    return {
      success: true,
      message: 'Login successful',
      data: tokens,
    };
  }

  // -------------------------------
  // OTP SEND
  // -------------------------------
  @Public()
  @Post('email/send-otp')
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  // -------------------------------
  // OTP VERIFY
  // -------------------------------
  @Public()
  @Post('email/verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  // -------------------------------
  // REFRESH TOKEN
  // -------------------------------
  @Public()
  @Post('refresh')
  async refresh(@Body() dto: RefreshDto): Promise<TokenPair> {
    return this.authService.refresh(dto);
  }

  // -------------------------------
  // LOGOUT
  // -------------------------------
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithSession,
  ) {
    const sessionId = req.sessionId ?? null;

    if (!sessionId) {
      return {
        success: true,
        message: 'Session ended',
        data: {},
      };
    }

    await this.authService.logout(user.id, sessionId);

    return {
      success: true,
      message: 'Logged out successfully',
      data: {},
    };
  }

  // -------------------------------
  // GET CURRENT USER
  // -------------------------------
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return {
      success: true,
      message: 'User profile fetched',
      data: user,
    };
  }
}
