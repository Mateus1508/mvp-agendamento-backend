import { Module } from '@nestjs/common';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { CompanyAuthGuard } from './guards/company-auth.guard';

@Module({
  controllers: [CompaniesController],
  providers: [CompaniesService, CompanyAuthGuard],
  exports: [CompaniesService],
})
export class CompaniesModule {}
