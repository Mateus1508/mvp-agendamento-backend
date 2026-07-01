import { Module, forwardRef } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { CompaniesModule } from '../companies/companies.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ClientAuthGuard } from './guards/client-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

const jwtExpiresIn = (process.env.JWT_EXPIRES_IN ??
  '7d') as JwtSignOptions['expiresIn'];

@Module({
  imports: [
    forwardRef(() => CompaniesModule),
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-only-change-me',
      signOptions: {
        expiresIn: jwtExpiresIn,
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    ClientAuthGuard,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [AuthService, JwtModule, ClientAuthGuard],
})
export class AuthModule {}
