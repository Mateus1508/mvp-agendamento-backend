import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { AuthUser } from './auth.types';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginCompanyDto } from './dto/login-company.dto';
import { RegisterCompanyDto } from './dto/register-company.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get('google')
  getGoogleAuthUrl(): { url: string } {
    return { url: this.authService.getGoogleAuthUrl() };
  }

  @Public()
  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    if (!code) {
      throw new UnauthorizedException('Código de autorização não informado');
    }

    const result = await this.authService.handleGoogleCallback(code);
    const frontendBaseUrl =
      process.env.FRONTEND_BASE_URL ?? 'http://localhost:5173';
    const redirectUrl = new URL('/cliente/chat', frontendBaseUrl);
    redirectUrl.searchParams.set('accessToken', result.accessToken);

    res.redirect(302, redirectUrl.toString());
  }

  @Public()
  @Post('company/register')
  registerCompany(@Body() dto: RegisterCompanyDto) {
    return this.authService.registerCompany(dto);
  }

  @Public()
  @Post('company/login')
  loginCompany(@Body() dto: LoginCompanyDto) {
    return this.authService.loginCompany(dto);
  }

  @Get('me')
  getProfile(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }
}
