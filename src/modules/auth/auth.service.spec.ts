import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;

  const prisma = {
    user: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const jwtService = {
    signAsync: jest.fn(),
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

  it('should validate an existing user from jwt payload', async () => {
    const user = {
      id: 'user-1',
      googleId: 'google-1',
      email: 'user@example.com',
      name: 'User',
      picture: null,
    };

    prisma.user.findUnique.mockResolvedValue(user);

    await expect(
      service.validateUser({ sub: 'user-1', email: 'user@example.com' }),
    ).resolves.toEqual(user);
  });

  it('should throw when jwt user does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.validateUser({ sub: 'missing', email: 'missing@example.com' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
