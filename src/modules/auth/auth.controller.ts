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
import { ApiTags, ApiOperation } from '@nestjs/swagger';

interface RequestWithSession extends Request {
  sessionId?: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // -------------------------------
  // REGISTER
  // -------------------------------
  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // -------------------------------
  // LOGIN
  // -------------------------------
  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
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
  @ApiOperation({ summary: 'Send email OTP' })
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  // -------------------------------
  // OTP VERIFY
  // -------------------------------
  @Public()
  @Post('email/verify-otp')
  @ApiOperation({ summary: 'Verify email OTP' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  // -------------------------------
  // REFRESH TOKEN
  // -------------------------------
  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh JWT token pair' })
  async refresh(@Body() dto: RefreshDto): Promise<TokenPair> {
    return this.authService.refresh(dto);
  }

  // -------------------------------
  // LOGOUT
  // -------------------------------
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiOperation({ summary: 'Logout and invalidate session' })
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
  @ApiOperation({ summary: 'Get current authenticated user' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return {
      success: true,
      message: 'User profile fetched',
      data: user,
    };
  }

  // -------------------------------
  // GOOGLE OAUTH (initiate)
  // -------------------------------
  @Public()
  @Get('google')
  @ApiOperation({ summary: 'Initiate Google OAuth flow' })
  async googleAuth(@Req() req: Request) {
    const result = await this.authService.getSocialAuthorizeUrl(
      'google',
      req.headers as any,
    );
    if (!result || !result.url) {
      return {
        success: false,
        message: 'Unable to get Google authorize URL',
        data: {},
      };
    }

    return {
      success: true,
      message: 'Redirect to Google',
      data: { url: result.url },
    };
  }
  // -------------------------------
  // GOOGLE EXCHANGE - Exchange Better Auth session for local TokenPair
  // -------------------------------
  @Public()
  @Post('google/exchange')
  @ApiOperation({ summary: 'Exchange Google OAuth session for JWT tokens' })
  async googleExchange(@Req() req: Request) {
    // The client should include cookies received from Better Auth callback.
    const tokens = await this.authService.exchangeSocialSession(
      req.headers as any,
    );

    return {
      success: true,
      message: 'Login successful',
      data: tokens,
    };
  }
}
