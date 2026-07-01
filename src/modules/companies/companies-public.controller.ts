import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ClientAuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ClientAuthGuard } from '../auth/guards/client-auth.guard';
import { CompaniesService } from './companies.service';
import { CreateClientBookingDto } from './dto/create-client-booking.dto';
import {
  ClientBookingConfirmation,
  CompanyAvailabilityResponse,
  PublicCompanyBooking,
  PublicCompanySummary,
} from './companies.types';

@Controller('companies/public')
@UseGuards(ClientAuthGuard)
export class CompaniesPublicController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  listBySegment(
    @Query('segment') segment?: string,
  ): Promise<PublicCompanySummary[]> {
    return this.companiesService.listPublicBySegment(segment?.trim() ?? '');
  }

  @Get(':slug/availability')
  getAvailability(
    @Param('slug') slug: string,
    @Query('days') days?: string,
  ): Promise<CompanyAvailabilityResponse> {
    const parsedDays = days ? Number.parseInt(days, 10) : 7;
    return this.companiesService.getPublicAvailability(
      slug,
      Number.isNaN(parsedDays) ? 7 : parsedDays,
    );
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string): Promise<PublicCompanyBooking> {
    return this.companiesService.getPublicCompanyBySlug(slug);
  }

  @Post(':slug/appointments')
  createBooking(
    @Param('slug') slug: string,
    @CurrentUser() user: ClientAuthUser,
    @Body() dto: CreateClientBookingDto,
  ): Promise<ClientBookingConfirmation> {
    return this.companiesService.createClientBooking(slug, user, dto);
  }
}
