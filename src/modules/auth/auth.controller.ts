import {
  Controller,
  Get,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { AuthUser, GoogleAuthResult } from './auth.types';

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

  @Get('me')
  getProfile(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }
}
