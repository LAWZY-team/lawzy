import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Res,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('auth')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const user = await this.authService.register(
      dto.email,
      dto.name,
      dto.password,
      dto.position,
    );
    return { message: 'Đăng ký thành công', user };
  }

  @Post('register/request')
  @HttpCode(HttpStatus.OK)
  async requestRegistration(@Body() dto: RegisterDto) {
    return this.authService.requestRegistration(
      dto.email,
      dto.name,
      dto.password,
      dto.position,
    );
  }

  @Post('register/verify')
  @HttpCode(HttpStatus.OK)
  async verifyOTP(@Body() dto: VerifyOtpDto) {
    const user = await this.authService.verifyOTP(dto.email, dto.otp);
    return { message: 'Đăng ký thành công', user };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(
      dto.email,
      dto.password,
      dto.companyCode,
    );
    const tokens = await this.authService.generateTokens(
      result.user.id,
      result.user.email,
    );
    this.authService.setAuthCookies(
      res,
      tokens.accessToken,
      tokens.refreshToken,
    );
    return { user: result.user, activeWorkspaceId: result.activeWorkspaceId };
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  async loginWithGoogle(
    @Body() dto: GoogleLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.loginWithGoogle(dto.idToken);
    const tokens = await this.authService.generateTokens(user.id, user.email);
    this.authService.setAuthCookies(
      res,
      tokens.accessToken,
      tokens.refreshToken,
    );
    return { user };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.refresh_token;
    if (!token) {
      this.authService.clearAuthCookies(res);
      return { error: 'No refresh token' };
    }
    const tokens = await this.authService.refreshTokens(token);
    this.authService.setAuthCookies(
      res,
      tokens.accessToken,
      tokens.refreshToken,
    );
    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: Request) {
    const user = await this.usersService.findById((req as any).user.userId);
    if (!user) return { error: 'User not found' };
    return this.usersService.sanitize(user);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) {
      try {
        await this.authService.revokeRefreshTokens(
          (req as any).user?.userId ?? '',
        );
      } catch {
        // token may already be invalid
      }
    }
    this.authService.clearAuthCookies(res);
    return { message: 'Đăng xuất thành công' };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(@Req() req: Request, @Body() dto: ChangePasswordDto) {
    const userId = (req as any).user.userId;
    return this.authService.changePassword(
      userId,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  async listSessions(@Req() req: Request) {
    const userId = (req as any).user.userId;
    const currentToken = req.cookies?.refresh_token;
    let sessions = await this.authService.listSessions(userId, currentToken);
    const hasCurrent = sessions.some((s) => s.isCurrent);
    if (!hasCurrent && sessions.length === 1 && currentToken) {
      // Only one session and we're authenticated → it's the current one (match may fail after refresh/encoding)
      sessions = [{ ...sessions[0], isCurrent: true }];
    }
    return sessions;
  }

  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard)
  async deleteSession(@Req() req: Request, @Param('id') id: string) {
    const userId = (req as any).user.userId;
    return this.authService.revokeSession(userId, id);
  }

  @Post('sessions/revoke-others')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async revokeOtherSessions(@Req() req: Request) {
    const userId = (req as any).user.userId;
    const keepToken = req.cookies?.refresh_token;
    return this.authService.revokeOtherSessions(userId, keepToken);
  }
}
