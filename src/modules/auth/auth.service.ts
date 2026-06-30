import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { google } from 'googleapis';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser, GoogleAuthResult, JwtPayload } from './auth.types';

@Injectable()
export class AuthService {
  private readonly clientId = process.env.GOOGLE_CLIENT_ID;
  private readonly clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  private readonly callbackUrl = process.env.GOOGLE_CALLBACK_URL;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  getGoogleAuthUrl(): string {
    const oauth2Client = this.createOAuthClient();

    return oauth2Client.generateAuthUrl({
      access_type: 'online',
      prompt: 'select_account',
      scope: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'openid',
      ],
    });
  }

  async handleGoogleCallback(code: string): Promise<GoogleAuthResult> {
    const oauth2Client = this.createOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      throw new UnauthorizedException('Google não retornou um access token válido');
    }

    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();

    if (!data.id || !data.email || !data.name) {
      throw new UnauthorizedException(
        'Não foi possível obter os dados do perfil Google',
      );
    }

    const user = await this.prisma.user.upsert({
      where: { googleId: data.id },
      update: {
        email: data.email,
        name: data.name,
        picture: data.picture ?? null,
      },
      create: {
        googleId: data.id,
        email: data.email,
        name: data.name,
        picture: data.picture ?? null,
      },
    });

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    } satisfies JwtPayload);

    return {
      accessToken,
      user: this.toAuthUser(user),
    };
  }

  async validateUser(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    return this.toAuthUser(user);
  }

  private createOAuthClient() {
    if (!this.clientId || !this.clientSecret || !this.callbackUrl) {
      throw new ServiceUnavailableException(
        'Google OAuth não configurado. Defina GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_CALLBACK_URL.',
      );
    }

    return new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      this.callbackUrl,
    );
  }

  private toAuthUser(user: {
    id: string;
    googleId: string;
    email: string;
    name: string;
    picture: string | null;
  }): AuthUser {
    return {
      id: user.id,
      googleId: user.googleId,
      email: user.email,
      name: user.name,
      picture: user.picture,
    };
  }
}
