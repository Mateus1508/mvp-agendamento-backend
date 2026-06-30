import { Body, Controller, Get, Post, Query, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthUser, GoogleAuthResult } from './auth.types';
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
    @Query('code') code?: string,
  ): Promise<GoogleAuthResult> {
    if (!code) {
      throw new UnauthorizedException('Código de autorização não informado');
    }

    return this.authService.handleGoogleCallback(code);
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
