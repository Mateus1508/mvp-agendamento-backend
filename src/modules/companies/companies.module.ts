import { Module } from '@nestjs/common';
import { ClientAuthGuard } from '../auth/guards/client-auth.guard';
import { CompaniesController } from './companies.controller';
import { CompaniesPublicController } from './companies-public.controller';
import { CompaniesService } from './companies.service';
import { CompanyAuthGuard } from './guards/company-auth.guard';

@Module({
  controllers: [CompaniesController, CompaniesPublicController],
  providers: [CompaniesService, CompanyAuthGuard, ClientAuthGuard],
  exports: [CompaniesService],
})
export class CompaniesModule {}
