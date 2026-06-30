import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { google } from 'googleapis';
import { PrismaService } from '../../prisma/prisma.service';
import { CompaniesService } from '../companies/companies.service';
import { generateUniqueSlug } from '../companies/companies.utils';
import {
  AuthResult,
  AuthUser,
  ClientAuthUser,
  CompanyAuthUser,
  GoogleAuthResult,
  JwtPayload,
} from './auth.types';
import { LoginCompanyDto } from './dto/login-company.dto';
import { RegisterCompanyDto } from './dto/register-company.dto';

const PASSWORD_SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  private readonly clientId = process.env.GOOGLE_CLIENT_ID;
  private readonly clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  private readonly callbackUrl = process.env.GOOGLE_CALLBACK_URL;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => CompaniesService))
    private readonly companiesService: CompaniesService,
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

    const client = await this.prisma.client.upsert({
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

    return this.buildAuthResult(this.toClientAuthUser(client));
  }

  async registerCompany(dto: RegisterCompanyDto): Promise<AuthResult> {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('As senhas não coincidem');
    }

    const existingUser = await this.prisma.companyUser.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Já existe uma conta com este e-mail');
    }

    const passwordHash = await bcrypt.hash(dto.password, PASSWORD_SALT_ROUNDS);
    const tradeName = dto.companyName.trim();

    const slug = await generateUniqueSlug(tradeName, async (candidate) => {
      const existing = await this.prisma.company.findUnique({
        where: { slug: candidate },
      });
      return Boolean(existing);
    });

    const companyUser = await this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: tradeName,
          segment: dto.segment,
          slug,
          tradeName,
        },
      });

      return tx.companyUser.create({
        data: {
          companyId: company.id,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          email: dto.email.trim().toLowerCase(),
          passwordHash,
        },
        include: { company: true },
      });
    });

    await this.companiesService.initializeBusinessHours(companyUser.companyId);

    const refreshedUser = await this.prisma.companyUser.findUniqueOrThrow({
      where: { id: companyUser.id },
      include: { company: true },
    });

    return this.buildAuthResult(this.toCompanyAuthUser(refreshedUser));
  }

  async loginCompany(dto: LoginCompanyDto): Promise<AuthResult> {
    const companyUser = await this.prisma.companyUser.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
      include: { company: true },
    });

    if (!companyUser) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      companyUser.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    return this.buildAuthResult(this.toCompanyAuthUser(companyUser));
  }

  async validateUser(payload: JwtPayload): Promise<AuthUser> {
    if (payload.type === 'company') {
      const companyUser = await this.prisma.companyUser.findUnique({
        where: { id: payload.sub },
        include: { company: true },
      });

      if (!companyUser) {
        throw new UnauthorizedException('Usuário não encontrado');
      }

      return this.toCompanyAuthUser(companyUser);
    }

    const client = await this.prisma.client.findUnique({
      where: { id: payload.sub },
    });

    if (!client) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    return this.toClientAuthUser(client);
  }

  private async buildAuthResult(user: AuthUser): Promise<AuthResult> {
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      type: user.type,
    } satisfies JwtPayload);

    return { accessToken, user };
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

  private toClientAuthUser(client: {
    id: string;
    googleId: string;
    email: string;
    name: string;
    picture: string | null;
  }): ClientAuthUser {
    return {
      type: 'client',
      id: client.id,
      googleId: client.googleId,
      email: client.email,
      name: client.name,
      picture: client.picture,
    };
  }

  private toCompanyAuthUser(companyUser: {
    id: string;
    companyId: string;
    firstName: string;
    lastName: string;
    email: string;
    company: { name: string; segment: string };
  }): CompanyAuthUser {
    return {
      type: 'company',
      id: companyUser.id,
      companyId: companyUser.companyId,
      firstName: companyUser.firstName,
      lastName: companyUser.lastName,
      email: companyUser.email,
      companyName: companyUser.company.name,
      segment: companyUser.company.segment,
    };
  }
}
