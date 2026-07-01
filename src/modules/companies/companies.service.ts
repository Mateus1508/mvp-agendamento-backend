import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, Prisma } from '@prisma/client';
import { CacheService } from '../../cache/cache.service';
import { CACHE_KEYS } from '../../cache/cache.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { ClientAuthUser } from '../auth/auth.types';
import { buildAppointmentDateFromParts } from '../appointments/validators/appointment-date.validator';
import { CompanyAuthUser } from '../auth/auth.types';
import {
  CompanyDashboardResponse,
  CompanyAvailabilityResponse,
  CompanyOnboardingResponse,
  ClientBookingConfirmation,
  PublicCompanyBooking,
  PublicCompanySummary,
} from './companies.types';
import {
  addDaysToDateString,
  formatDateLabel,
  formatTimeInTimezone,
  generateHourlySlots,
  getDateStringInTimezone,
  getDayBounds,
  getDayOfWeekFromDateString,
  isTimeAfterNow,
} from './companies-availability.utils';
import {
  ALL_DAYS_OF_WEEK,
  formatDayOfWeek,
  generateUniqueSlug,
  isEndTimeAfterStartTime,
  isValidTime,
} from './companies.utils';
import {
  BusinessHourItemDto,
  UpdateAgentConfigDto,
  UpdateBusinessHoursDto,
  UpdateCompanyLocationDto,
  UpdateCompanyProfileDto,
  UpdateEmployeesDto,
  ServiceItemDto,
  UpdateServicesDto,
} from './dto/company-onboarding.dto';
import { CreateClientBookingDto } from './dto/create-client-booking.dto';

const companyInclude = {
  address: true,
  businessHours: { orderBy: { dayOfWeek: 'asc' as const } },
  employees: { orderBy: { createdAt: 'asc' as const } },
  services: { orderBy: { createdAt: 'asc' as const } },
  agentConfig: true,
  calendarConnection: true,
} satisfies Prisma.CompanyInclude;

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  async initializeBusinessHours(companyId: string): Promise<void> {
    await this.prisma.businessHour.createMany({
      data: ALL_DAYS_OF_WEEK.map((dayOfWeek) => ({
        companyId,
        dayOfWeek,
        enabled: false,
      })),
      skipDuplicates: true,
    });
  }

  /** @deprecated use initializeBusinessHours */
  async initializeCompany(companyId: string, tradeName: string): Promise<void> {
    const slug = await generateUniqueSlug(tradeName, async (candidate) => {
      const existing = await this.prisma.company.findUnique({
        where: { slug: candidate },
      });
      return Boolean(existing);
    });

    await this.prisma.company.update({
      where: { id: companyId },
      data: {
        slug,
        tradeName,
      },
    });

    await this.initializeBusinessHours(companyId);
  }

  async getOnboarding(
    user: CompanyAuthUser,
  ): Promise<CompanyOnboardingResponse> {
    const company = await this.findCompanyOrThrow(user.companyId);
    return this.toOnboardingResponse(company);
  }

  async getDashboard(user: CompanyAuthUser): Promise<CompanyDashboardResponse> {
    const companyId = user.companyId;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const inSevenDays = new Date(now);
    inSevenDays.setDate(inSevenDays.getDate() + 7);

    const completedFilter = {
      companyId,
      status: AppointmentStatus.COMPLETED,
      amount: { not: null },
    } as const;

    const [
      company,
      totalCustomers,
      totalAppointments,
      completedAppointments,
      upcomingAppointments,
      appointmentsThisMonth,
      totalRevenueAggregate,
      revenueThisMonthAggregate,
      activeEmployees,
      servicesCount,
    ] = await Promise.all([
      this.prisma.company.findUniqueOrThrow({
        where: { id: companyId },
        select: { tradeName: true, name: true },
      }),
      this.prisma.customer.count({ where: { companyId } }),
      this.prisma.appointment.count({ where: { companyId } }),
      this.prisma.appointment.count({
        where: { companyId, status: AppointmentStatus.COMPLETED },
      }),
      this.prisma.appointment.count({
        where: {
          companyId,
          status: AppointmentStatus.SCHEDULED,
          date: { gte: now, lte: inSevenDays },
        },
      }),
      this.prisma.appointment.count({
        where: { companyId, date: { gte: startOfMonth } },
      }),
      this.prisma.appointment.aggregate({
        where: completedFilter,
        _sum: { amount: true },
      }),
      this.prisma.appointment.aggregate({
        where: {
          ...completedFilter,
          date: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
      this.prisma.employee.count({ where: { companyId, active: true } }),
      this.prisma.service.count({ where: { companyId } }),
    ]);

    const totalRevenue = Number(totalRevenueAggregate._sum.amount ?? 0);
    const revenueThisMonth = Number(revenueThisMonthAggregate._sum.amount ?? 0);

    return {
      companyName: company.tradeName ?? company.name,
      totalCustomers,
      totalAppointments,
      completedAppointments,
      upcomingAppointments,
      appointmentsThisMonth,
      totalRevenue,
      revenueThisMonth,
      averageTicket:
        completedAppointments > 0 ? totalRevenue / completedAppointments : 0,
      activeEmployees,
      servicesCount,
    };
  }

  async updateProfile(
    user: CompanyAuthUser,
    dto: UpdateCompanyProfileDto,
  ): Promise<CompanyOnboardingResponse> {
    await this.prisma.company.update({
      where: { id: user.companyId },
      data: {
        tradeName: dto.tradeName.trim(),
        legalName: dto.legalName?.trim() || null,
        cnpj: dto.cnpj?.trim() || null,
        phone: dto.phone.trim(),
        whatsapp: dto.whatsapp.trim(),
        supportEmail: dto.supportEmail.trim().toLowerCase(),
        website: dto.website?.trim() || null,
      },
    });

    await this.updateOnboardingStep(user.companyId, 1);

    return this.toOnboardingResponse(
      await this.findCompanyOrThrow(user.companyId),
    );
  }

  async updateLocation(
    user: CompanyAuthUser,
    dto: UpdateCompanyLocationDto,
  ): Promise<CompanyOnboardingResponse> {
    await this.prisma.companyAddress.upsert({
      where: { companyId: user.companyId },
      update: {
        zipCode: dto.zipCode.trim(),
        street: dto.street.trim(),
        number: dto.number.trim(),
        complement: dto.complement?.trim() || null,
        city: dto.city.trim(),
        state: dto.state.trim().toUpperCase(),
      },
      create: {
        companyId: user.companyId,
        zipCode: dto.zipCode.trim(),
        street: dto.street.trim(),
        number: dto.number.trim(),
        complement: dto.complement?.trim() || null,
        city: dto.city.trim(),
        state: dto.state.trim().toUpperCase(),
      },
    });

    await this.updateOnboardingStep(user.companyId, 2);

    return this.toOnboardingResponse(
      await this.findCompanyOrThrow(user.companyId),
    );
  }

  async updateBusinessHours(
    user: CompanyAuthUser,
    dto: UpdateBusinessHoursDto,
  ): Promise<CompanyOnboardingResponse> {
    this.validateBusinessHours(dto.businessHours);

    const days = dto.businessHours.map((item) => item.dayOfWeek);
    const uniqueDays = new Set(days);

    if (uniqueDays.size !== ALL_DAYS_OF_WEEK.length) {
      throw new BadRequestException(
        'Informe exatamente um horário para cada dia da semana',
      );
    }

    for (const day of ALL_DAYS_OF_WEEK) {
      if (!uniqueDays.has(day)) {
        throw new BadRequestException(
          `Dia ${formatDayOfWeek(day)} não informado`,
        );
      }
    }

    await this.prisma.$transaction(
      dto.businessHours.map((item) =>
        this.prisma.businessHour.upsert({
          where: {
            companyId_dayOfWeek: {
              companyId: user.companyId,
              dayOfWeek: item.dayOfWeek,
            },
          },
          update: {
            enabled: item.enabled,
            startTime: item.enabled ? item.startTime! : null,
            endTime: item.enabled ? item.endTime! : null,
          },
          create: {
            companyId: user.companyId,
            dayOfWeek: item.dayOfWeek,
            enabled: item.enabled,
            startTime: item.enabled ? item.startTime! : null,
            endTime: item.enabled ? item.endTime! : null,
          },
        }),
      ),
    );

    await this.updateOnboardingStep(user.companyId, 3);

    return this.toOnboardingResponse(
      await this.findCompanyOrThrow(user.companyId),
    );
  }

  async updateEmployees(
    user: CompanyAuthUser,
    dto: UpdateEmployeesDto,
  ): Promise<CompanyOnboardingResponse> {
    if (dto.employees.length === 0) {
      throw new BadRequestException('Adicione pelo menos um funcionário');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.employee.deleteMany({ where: { companyId: user.companyId } });

      await tx.employee.createMany({
        data: dto.employees.map((employee) => ({
          companyId: user.companyId,
          name: employee.name.trim(),
          specialty: employee.specialty.trim(),
          schedule: employee.schedule?.trim() || null,
          googleCalendarConnected: employee.googleCalendarConnected ?? false,
          active: employee.active,
        })),
      });
    });

    await this.updateOnboardingStep(user.companyId, 4);

    return this.toOnboardingResponse(
      await this.findCompanyOrThrow(user.companyId),
    );
  }

  async updateServices(
    user: CompanyAuthUser,
    dto: UpdateServicesDto,
  ): Promise<CompanyOnboardingResponse> {
    if (dto.services.length === 0) {
      throw new BadRequestException('Adicione pelo menos um serviço');
    }

    this.validateServices(dto.services);

    await this.prisma.$transaction(async (tx) => {
      await tx.service.deleteMany({ where: { companyId: user.companyId } });

      await tx.service.createMany({
        data: dto.services.map((service) => ({
          companyId: user.companyId,
          name: service.name.trim(),
          priceMin: service.priceMin,
          priceMax: service.priceMax,
          description: service.description?.trim() || null,
        })),
      });
    });

    await this.updateOnboardingStep(user.companyId, 5);

    return this.toOnboardingResponse(
      await this.findCompanyOrThrow(user.companyId),
    );
  }

  async skipCalendar(
    user: CompanyAuthUser,
  ): Promise<CompanyOnboardingResponse> {
    await this.updateOnboardingStep(user.companyId, 6);

    return this.toOnboardingResponse(
      await this.findCompanyOrThrow(user.companyId),
    );
  }

  async updateAgentConfig(
    user: CompanyAuthUser,
    dto: UpdateAgentConfigDto,
  ): Promise<CompanyOnboardingResponse> {
    await this.prisma.companyAgentConfig.upsert({
      where: { companyId: user.companyId },
      update: {
        agentName: dto.agentName.trim(),
        personality: dto.personality,
        initialMessage: dto.initialMessage.trim(),
        customInstructions: dto.customInstructions?.trim() || null,
      },
      create: {
        companyId: user.companyId,
        agentName: dto.agentName.trim(),
        personality: dto.personality,
        initialMessage: dto.initialMessage.trim(),
        customInstructions: dto.customInstructions?.trim() || null,
      },
    });

    await this.updateOnboardingStep(user.companyId, 7);

    return this.toOnboardingResponse(
      await this.findCompanyOrThrow(user.companyId),
    );
  }

  async completeOnboarding(
    user: CompanyAuthUser,
  ): Promise<CompanyOnboardingResponse> {
    await this.prisma.company.update({
      where: { id: user.companyId },
      data: {
        onboardingStep: 8,
        onboardingCompletedAt: new Date(),
      },
    });

    return this.toOnboardingResponse(
      await this.findCompanyOrThrow(user.companyId),
    );
  }

  private validateBusinessHours(businessHours: BusinessHourItemDto[]): void {
    const hasEnabledDay = businessHours.some((item) => item.enabled);

    if (!hasEnabledDay) {
      throw new BadRequestException(
        'Ative pelo menos um dia da semana com horário de funcionamento',
      );
    }

    for (const item of businessHours) {
      if (!item.enabled) {
        continue;
      }

      if (!item.startTime || !item.endTime) {
        throw new BadRequestException(
          `Informe início e fim para ${formatDayOfWeek(item.dayOfWeek)}`,
        );
      }

      if (!isValidTime(item.startTime) || !isValidTime(item.endTime)) {
        throw new BadRequestException('Horários devem estar no formato HH:mm');
      }

      if (!isEndTimeAfterStartTime(item.startTime, item.endTime)) {
        throw new BadRequestException(
          `O horário final deve ser maior que o inicial em ${formatDayOfWeek(item.dayOfWeek)}`,
        );
      }
    }
  }

  private validateServices(services: ServiceItemDto[]): void {
    for (const service of services) {
      if (service.priceMax < service.priceMin) {
        const label = service.name.trim() || 'serviço';
        throw new BadRequestException(
          `O valor máximo deve ser maior ou igual ao mínimo em "${label}"`,
        );
      }
    }
  }

  private async updateOnboardingStep(
    companyId: string,
    step: number,
  ): Promise<void> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { onboardingStep: true },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    if (step > company.onboardingStep) {
      await this.prisma.company.update({
        where: { id: companyId },
        data: { onboardingStep: step },
      });
    }
  }

  private async findCompanyOrThrow(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: companyInclude,
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return company;
  }

  private toOnboardingResponse(
    company: Prisma.CompanyGetPayload<{ include: typeof companyInclude }>,
  ): CompanyOnboardingResponse {
    const frontendBaseUrl =
      process.env.FRONTEND_BASE_URL ?? 'http://localhost:5173';

    return {
      id: company.id,
      slug: company.slug,
      name: company.name,
      segment: company.segment,
      tradeName: company.tradeName,
      legalName: company.legalName,
      cnpj: company.cnpj,
      phone: company.phone,
      whatsapp: company.whatsapp,
      supportEmail: company.supportEmail,
      website: company.website,
      onboardingStep: company.onboardingStep,
      onboardingCompletedAt:
        company.onboardingCompletedAt?.toISOString() ?? null,
      bookingUrl: `${frontendBaseUrl}/agendar/${company.slug}`,
      address: company.address
        ? {
            zipCode: company.address.zipCode,
            street: company.address.street,
            number: company.address.number,
            complement: company.address.complement,
            city: company.address.city,
            state: company.address.state,
          }
        : null,
      businessHours: company.businessHours.map((hour) => ({
        dayOfWeek: hour.dayOfWeek,
        enabled: hour.enabled,
        startTime: hour.startTime,
        endTime: hour.endTime,
      })),
      employees: company.employees.map((employee) => ({
        id: employee.id,
        name: employee.name,
        specialty: employee.specialty,
        schedule: employee.schedule,
        googleCalendarConnected: employee.googleCalendarConnected,
        active: employee.active,
      })),
      services: company.services.map((service) => ({
        id: service.id,
        name: service.name,
        priceMin: Number(service.priceMin),
        priceMax: Number(service.priceMax),
        description: service.description,
      })),
      agentConfig: company.agentConfig
        ? {
            agentName: company.agentConfig.agentName,
            personality: company.agentConfig.personality,
            initialMessage: company.agentConfig.initialMessage,
            customInstructions: company.agentConfig.customInstructions,
          }
        : null,
      calendarConnected: Boolean(company.calendarConnection?.connectedAt),
    };
  }

  async listPublicBySegment(segment: string): Promise<PublicCompanySummary[]> {
    const normalizedSegment = segment.trim();

    if (!normalizedSegment) {
      return [];
    }

    const cacheKey = CACHE_KEYS.companiesBySegment(normalizedSegment);
    const cached = await this.cacheService.get<PublicCompanySummary[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const companies = await this.prisma.company.findMany({
      where: {
        segment: normalizedSegment,
        onboardingCompletedAt: { not: null },
      },
      include: {
        address: true,
        services: {
          select: { name: true },
          orderBy: { createdAt: 'asc' },
          take: 3,
        },
      },
      orderBy: { name: 'asc' },
    });

    const frontendBaseUrl =
      process.env.FRONTEND_BASE_URL ?? 'http://localhost:5173';

    const result = companies.map((company) => ({
      id: company.id,
      slug: company.slug,
      name: company.tradeName ?? company.name,
      segment: company.segment,
      city: company.address?.city ?? null,
      state: company.address?.state ?? null,
      servicesPreview: company.services.map((service) => service.name),
      bookingUrl: `${frontendBaseUrl}/agendar/${company.slug}`,
    }));

    await this.cacheService.set(cacheKey, result);

    return result;
  }

  async getPublicCompanyBySlug(slug: string): Promise<PublicCompanyBooking> {
    const company = await this.prisma.company.findFirst({
      where: {
        slug,
        onboardingCompletedAt: { not: null },
      },
      include: {
        address: true,
        services: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return {
      id: company.id,
      slug: company.slug,
      name: company.tradeName ?? company.name,
      segment: company.segment,
      city: company.address?.city ?? null,
      state: company.address?.state ?? null,
      phone: company.phone,
      whatsapp: company.whatsapp,
      address: company.address
        ? {
            zipCode: company.address.zipCode,
            street: company.address.street,
            number: company.address.number,
            complement: company.address.complement,
            city: company.address.city,
            state: company.address.state,
          }
        : null,
      services: company.services.map((service) => ({
        id: service.id,
        name: service.name,
        priceMin: Number(service.priceMin),
        priceMax: Number(service.priceMax),
        description: service.description,
      })),
    };
  }

  async createClientBooking(
    slug: string,
    client: ClientAuthUser,
    dto: CreateClientBookingDto,
  ): Promise<ClientBookingConfirmation> {
    const company = await this.prisma.company.findFirst({
      where: {
        slug,
        onboardingCompletedAt: { not: null },
      },
      include: {
        address: true,
        services: true,
      },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const availability = await this.getPublicAvailability(slug, 14);
    const day = availability.days.find((item) => item.date === dto.date);

    if (!day?.slots.includes(dto.time)) {
      throw new BadRequestException('Horário indisponível para agendamento');
    }

    const service = dto.serviceId
      ? company.services.find((item) => item.id === dto.serviceId)
      : company.services[0];

    if (dto.serviceId && !service) {
      throw new BadRequestException('Serviço inválido para esta empresa');
    }

    const appointmentDate = buildAppointmentDateFromParts(dto.date, dto.time);

    const conflictingAppointment = await this.prisma.appointment.findFirst({
      where: {
        companyId: company.id,
        status: { not: AppointmentStatus.CANCELLED },
        date: appointmentDate,
      },
    });

    if (conflictingAppointment) {
      throw new BadRequestException('Este horário acabou de ser reservado');
    }

    const customer = await this.findOrCreateCustomerForClient(company.id, client);

    const appointment = await this.prisma.appointment.create({
      data: {
        companyId: company.id,
        customerId: customer.id,
        serviceId: service?.id,
        amount: service ? service.priceMin : null,
        date: appointmentDate,
        status: AppointmentStatus.SCHEDULED,
      },
    });

    return {
      appointmentId: appointment.id,
      date: dto.date,
      time: dto.time,
      serviceName: service?.name ?? null,
      company: {
        name: company.tradeName ?? company.name,
        segment: company.segment,
        phone: company.phone,
        whatsapp: company.whatsapp,
        address: company.address
          ? {
              zipCode: company.address.zipCode,
              street: company.address.street,
              number: company.address.number,
              complement: company.address.complement,
              city: company.address.city,
              state: company.address.state,
            }
          : null,
      },
    };
  }

  private async findOrCreateCustomerForClient(
    companyId: string,
    client: ClientAuthUser,
  ) {
    const existingCustomer = await this.prisma.customer.findFirst({
      where: {
        companyId,
        phone: client.email,
      },
    });

    if (existingCustomer) {
      return existingCustomer;
    }

    return this.prisma.customer.create({
      data: {
        companyId,
        name: client.name,
        phone: client.email,
      },
    });
  }

  async getPublicAvailability(
    slug: string,
    days = 7,
  ): Promise<CompanyAvailabilityResponse> {
    const company = await this.prisma.company.findFirst({
      where: {
        slug,
        onboardingCompletedAt: { not: null },
      },
      include: { businessHours: true },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const safeDays = Math.min(Math.max(days, 1), 14);
    const startDate = getDateStringInTimezone(new Date());
    const availability: CompanyAvailabilityResponse['days'] = [];

    for (let offset = 0; offset < safeDays; offset += 1) {
      const date = addDaysToDateString(startDate, offset);
      const dayOfWeek = getDayOfWeekFromDateString(date);
      const businessHour = company.businessHours.find(
        (hour) => hour.dayOfWeek === dayOfWeek,
      );

      if (
        !businessHour?.enabled ||
        !businessHour.startTime ||
        !businessHour.endTime
      ) {
        availability.push({
          date,
          label: formatDateLabel(date),
          slots: [],
        });
        continue;
      }

      const allSlots = generateHourlySlots(
        businessHour.startTime,
        businessHour.endTime,
      );
      const { start, end } = getDayBounds(date);
      const appointments = await this.prisma.appointment.findMany({
        where: {
          companyId: company.id,
          status: { not: AppointmentStatus.CANCELLED },
          date: { gte: start, lte: end },
        },
        select: { date: true },
      });

      const bookedTimes = new Set(
        appointments.map((appointment) =>
          formatTimeInTimezone(appointment.date),
        ),
      );

      const slots = allSlots.filter(
        (slot) =>
          !bookedTimes.has(slot) && isTimeAfterNow(date, slot),
      );

      availability.push({
        date,
        label: formatDateLabel(date),
        slots,
      });
    }

    return { days: availability };
  }
}
