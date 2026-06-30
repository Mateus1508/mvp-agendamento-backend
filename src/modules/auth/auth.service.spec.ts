import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CompaniesService } from '../companies/companies.service';
import { RegisterCompanyDto } from './dto/register-company.dto';

describe('AuthService', () => {
  let service: AuthService;

  const prisma = {
    client: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
    companyUser: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
    },
    company: {
      create: jest.fn(),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    $transaction: jest.fn(),
  };

  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('jwt-token'),
  };

  const registerDto: RegisterCompanyDto = {
    companyName: 'Studio Bella',
    segment: 'Beleza e Estética',
    firstName: 'Maria',
    lastName: 'Silva',
    email: 'maria@studio.com',
    password: 'senha1234',
    confirmPassword: 'senha1234',
  };

  const companiesService = {
    initializeBusinessHours: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    process.env.GOOGLE_CLIENT_ID = 'client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'client-secret';
    process.env.GOOGLE_CALLBACK_URL =
      'http://localhost:3000/auth/google/callback';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: CompaniesService, useValue: companiesService },
      ],
    }).compile();

    service = module.get(AuthService);
    jest.clearAllMocks();
  });

  it('should generate a Google auth URL', () => {
    const result = service.getGoogleAuthUrl();

    expect(result).toContain('accounts.google.com');
    expect(result).toContain('client_id=client-id');
  });

  it('should validate an existing client from jwt payload', async () => {
    const client = {
      id: 'client-1',
      googleId: 'google-1',
      email: 'user@example.com',
      name: 'User',
      picture: null,
    };

    prisma.client.findUnique.mockResolvedValue(client);

    await expect(
      service.validateUser({
        sub: 'client-1',
        email: 'user@example.com',
        type: 'client',
      }),
    ).resolves.toEqual({
      type: 'client',
      ...client,
    });
  });

  it('should throw when jwt client does not exist', async () => {
    prisma.client.findUnique.mockResolvedValue(null);

    await expect(
      service.validateUser({
        sub: 'missing',
        email: 'missing@example.com',
        type: 'client',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('should reject company registration when passwords do not match', async () => {
    await expect(
      service.registerCompany({
        ...registerDto,
        confirmPassword: 'outra-senha',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should reject company registration when email already exists', async () => {
    prisma.companyUser.findUnique.mockResolvedValue({ id: 'existing' });

    await expect(service.registerCompany(registerDto)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('should register a company and return jwt', async () => {
    prisma.companyUser.findUnique.mockResolvedValue(null);
    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof prisma) => Promise<unknown>) =>
        callback({
          company: {
            create: jest.fn().mockResolvedValue({
              id: 'company-1',
              name: registerDto.companyName,
              segment: registerDto.segment,
            }),
          },
          companyUser: {
            create: jest.fn().mockResolvedValue({
              id: 'user-1',
              companyId: 'company-1',
              firstName: registerDto.firstName,
              lastName: registerDto.lastName,
              email: registerDto.email,
              passwordHash: 'hash',
              company: {
                name: registerDto.companyName,
                segment: registerDto.segment,
              },
            }),
          },
        }),
    );

    prisma.companyUser.findUniqueOrThrow.mockResolvedValue({
      id: 'user-1',
      companyId: 'company-1',
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      email: registerDto.email,
      company: {
        name: registerDto.companyName,
        segment: registerDto.segment,
      },
    });

    const result = await service.registerCompany(registerDto);

    expect(companiesService.initializeBusinessHours).toHaveBeenCalledWith(
      'company-1',
    );

    expect(result.accessToken).toBe('jwt-token');
    expect(result.user).toEqual({
      type: 'company',
      id: 'user-1',
      companyId: 'company-1',
      firstName: 'Maria',
      lastName: 'Silva',
      email: 'maria@studio.com',
      companyName: 'Studio Bella',
      segment: 'Beleza e Estética',
    });
  });

  it('should login company with valid credentials', async () => {
    const passwordHash = await bcrypt.hash('senha1234', 10);

    prisma.companyUser.findUnique.mockResolvedValue({
      id: 'user-1',
      companyId: 'company-1',
      firstName: 'Maria',
      lastName: 'Silva',
      email: 'maria@studio.com',
      passwordHash,
      company: {
        name: 'Studio Bella',
        segment: 'Beleza e Estética',
      },
    });

    const result = await service.loginCompany({
      email: 'maria@studio.com',
      password: 'senha1234',
    });

    expect(result.accessToken).toBe('jwt-token');
    expect(result.user.type).toBe('company');
  });

  it('should reject invalid company login', async () => {
    prisma.companyUser.findUnique.mockResolvedValue(null);

    await expect(
      service.loginCompany({
        email: 'maria@studio.com',
        password: 'senha1234',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
