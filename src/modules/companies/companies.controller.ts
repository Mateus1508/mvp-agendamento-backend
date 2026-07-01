import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CompanyAuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CompaniesService } from './companies.service';
import {
  CompanyOnboardingResponse,
  CompanyDashboardResponse,
} from './companies.types';
import {
  UpdateAgentConfigDto,
  UpdateBusinessHoursDto,
  UpdateCompanyLocationDto,
  UpdateCompanyProfileDto,
  UpdateEmployeesDto,
  UpdateServicesDto,
} from './dto/company-onboarding.dto';
import { CompanyAuthGuard } from './guards/company-auth.guard';

@Controller('companies/me')
@UseGuards(CompanyAuthGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  getOnboarding(
    @CurrentUser() user: CompanyAuthUser,
  ): Promise<CompanyOnboardingResponse> {
    return this.companiesService.getOnboarding(user);
  }

  @Get('dashboard')
  getDashboard(
    @CurrentUser() user: CompanyAuthUser,
  ): Promise<CompanyDashboardResponse> {
    return this.companiesService.getDashboard(user);
  }

  @Patch('profile')
  updateProfile(
    @CurrentUser() user: CompanyAuthUser,
    @Body() dto: UpdateCompanyProfileDto,
  ): Promise<CompanyOnboardingResponse> {
    return this.companiesService.updateProfile(user, dto);
  }

  @Patch('location')
  updateLocation(
    @CurrentUser() user: CompanyAuthUser,
    @Body() dto: UpdateCompanyLocationDto,
  ): Promise<CompanyOnboardingResponse> {
    return this.companiesService.updateLocation(user, dto);
  }

  @Put('business-hours')
  updateBusinessHours(
    @CurrentUser() user: CompanyAuthUser,
    @Body() dto: UpdateBusinessHoursDto,
  ): Promise<CompanyOnboardingResponse> {
    return this.companiesService.updateBusinessHours(user, dto);
  }

  @Put('employees')
  updateEmployees(
    @CurrentUser() user: CompanyAuthUser,
    @Body() dto: UpdateEmployeesDto,
  ): Promise<CompanyOnboardingResponse> {
    return this.companiesService.updateEmployees(user, dto);
  }

  @Put('services')
  updateServices(
    @CurrentUser() user: CompanyAuthUser,
    @Body() dto: UpdateServicesDto,
  ): Promise<CompanyOnboardingResponse> {
    return this.companiesService.updateServices(user, dto);
  }

  @Post('calendar/skip')
  skipCalendar(
    @CurrentUser() user: CompanyAuthUser,
  ): Promise<CompanyOnboardingResponse> {
    return this.companiesService.skipCalendar(user);
  }

  @Patch('agent')
  updateAgent(
    @CurrentUser() user: CompanyAuthUser,
    @Body() dto: UpdateAgentConfigDto,
  ): Promise<CompanyOnboardingResponse> {
    return this.companiesService.updateAgentConfig(user, dto);
  }

  @Post('onboarding/complete')
  completeOnboarding(
    @CurrentUser() user: CompanyAuthUser,
  ): Promise<CompanyOnboardingResponse> {
    return this.companiesService.completeOnboarding(user);
  }
}
