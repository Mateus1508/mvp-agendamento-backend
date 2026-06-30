import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DayOfWeek, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CompanyAuthUser } from '../auth/auth.types';
import { CompanyOnboardingResponse } from './companies.types';
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
  constructor(private readonly prisma: PrismaService) {}

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

  async getOnboarding(user: CompanyAuthUser): Promise<CompanyOnboardingResponse> {
    const company = await this.findCompanyOrThrow(user.companyId);
    return this.toOnboardingResponse(company);
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
        throw new BadRequestException(`Dia ${formatDayOfWeek(day)} não informado`);
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

  async skipCalendar(user: CompanyAuthUser): Promise<CompanyOnboardingResponse> {
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
      onboardingCompletedAt: company.onboardingCompletedAt?.toISOString() ?? null,
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
}
