import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { AgentPersonality, DayOfWeek } from '@prisma/client';
import {
  fieldLabels,
  validationMessages,
} from '../../../common/validation/validation-messages';

export class UpdateCompanyProfileDto {
  @IsString({ message: validationMessages.string(fieldLabels.tradeName) })
  @IsNotEmpty({ message: validationMessages.notEmpty(fieldLabels.tradeName) })
  tradeName: string;

  @IsOptional()
  @IsString({ message: validationMessages.string(fieldLabels.legalName) })
  legalName?: string;

  @IsOptional()
  @IsString({ message: validationMessages.string(fieldLabels.cnpj) })
  cnpj?: string;

  @IsString({ message: validationMessages.string(fieldLabels.phone) })
  @IsNotEmpty({ message: validationMessages.notEmpty(fieldLabels.phone) })
  phone: string;

  @IsString({ message: validationMessages.string(fieldLabels.whatsapp) })
  @IsNotEmpty({ message: validationMessages.notEmpty(fieldLabels.whatsapp) })
  whatsapp: string;

  @IsEmail({}, { message: validationMessages.email() })
  supportEmail: string;

  @IsOptional()
  @IsString({ message: validationMessages.string(fieldLabels.website) })
  website?: string;
}

export class UpdateCompanyLocationDto {
  @IsString({ message: validationMessages.string(fieldLabels.zipCode) })
  @IsNotEmpty({ message: validationMessages.notEmpty(fieldLabels.zipCode) })
  zipCode: string;

  @IsString({ message: validationMessages.string(fieldLabels.street) })
  @IsNotEmpty({ message: validationMessages.notEmpty(fieldLabels.street) })
  street: string;

  @IsString({ message: validationMessages.string(fieldLabels.number) })
  @IsNotEmpty({ message: validationMessages.notEmpty(fieldLabels.number) })
  number: string;

  @IsOptional()
  @IsString({ message: validationMessages.string(fieldLabels.complement) })
  complement?: string;

  @IsString({ message: validationMessages.string(fieldLabels.city) })
  @IsNotEmpty({ message: validationMessages.notEmpty(fieldLabels.city) })
  city: string;

  @IsString({ message: validationMessages.string(fieldLabels.state) })
  @IsNotEmpty({ message: validationMessages.notEmpty(fieldLabels.state) })
  state: string;
}

export class BusinessHourItemDto {
  @IsEnum(DayOfWeek, {
    message: validationMessages.enum(fieldLabels.dayOfWeek),
  })
  dayOfWeek: DayOfWeek;

  @IsBoolean({ message: validationMessages.boolean(fieldLabels.enabled) })
  enabled: boolean;

  @IsOptional()
  @IsString({ message: validationMessages.string(fieldLabels.startTime) })
  startTime?: string | null;

  @IsOptional()
  @IsString({ message: validationMessages.string(fieldLabels.endTime) })
  endTime?: string | null;
}

export class UpdateBusinessHoursDto {
  @IsArray({ message: validationMessages.array(fieldLabels.businessHours) })
  @ArrayMinSize(7, { message: 'Informe os horários dos 7 dias da semana' })
  @ValidateNested({ each: true })
  @Type(() => BusinessHourItemDto)
  businessHours: BusinessHourItemDto[];
}

export class EmployeeItemDto {
  @IsOptional()
  @IsString({ message: validationMessages.string('o identificador') })
  id?: string;

  @IsString({ message: validationMessages.string(fieldLabels.name) })
  @IsNotEmpty({ message: validationMessages.notEmpty(fieldLabels.name) })
  name: string;

  @IsString({ message: validationMessages.string(fieldLabels.specialty) })
  @IsNotEmpty({ message: validationMessages.notEmpty(fieldLabels.specialty) })
  specialty: string;

  @IsOptional()
  @IsString({ message: validationMessages.string(fieldLabels.schedule) })
  schedule?: string;

  @IsOptional()
  @IsBoolean({
    message: validationMessages.boolean(fieldLabels.googleCalendarConnected),
  })
  googleCalendarConnected?: boolean;

  @IsBoolean({ message: validationMessages.boolean(fieldLabels.active) })
  active: boolean;
}

export class UpdateEmployeesDto {
  @IsArray({ message: validationMessages.array(fieldLabels.employees) })
  @ValidateNested({ each: true })
  @Type(() => EmployeeItemDto)
  employees: EmployeeItemDto[];
}

export class ServiceItemDto {
  @IsOptional()
  @IsString({ message: validationMessages.string('o identificador') })
  id?: string;

  @IsString({ message: validationMessages.string(fieldLabels.name) })
  @IsNotEmpty({ message: validationMessages.notEmpty(fieldLabels.name) })
  name: string;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: validationMessages.number(fieldLabels.priceMin) },
  )
  @Min(0, { message: validationMessages.min(fieldLabels.priceMin, 0) })
  priceMin: number;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: validationMessages.number(fieldLabels.priceMax) },
  )
  @Min(0, { message: validationMessages.min(fieldLabels.priceMax, 0) })
  priceMax: number;

  @IsOptional()
  @IsString({ message: validationMessages.string(fieldLabels.description) })
  description?: string;
}

export class UpdateServicesDto {
  @IsArray({ message: validationMessages.array(fieldLabels.services) })
  @ValidateNested({ each: true })
  @Type(() => ServiceItemDto)
  services: ServiceItemDto[];
}

export class UpdateAgentConfigDto {
  @IsString({ message: validationMessages.string(fieldLabels.agentName) })
  @IsNotEmpty({ message: validationMessages.notEmpty(fieldLabels.agentName) })
  agentName: string;

  @IsEnum(AgentPersonality, {
    message: validationMessages.enum(fieldLabels.personality),
  })
  personality: AgentPersonality;

  @IsString({ message: validationMessages.string(fieldLabels.initialMessage) })
  @IsNotEmpty({
    message: validationMessages.notEmpty(fieldLabels.initialMessage),
  })
  initialMessage: string;

  @IsOptional()
  @IsString({
    message: validationMessages.string(fieldLabels.customInstructions),
  })
  customInstructions?: string;
}

export class UpdateOnboardingStepDto {
  @IsNumber({}, { message: validationMessages.number(fieldLabels.step) })
  @Min(0, { message: validationMessages.min(fieldLabels.step, 0) })
  step: number;
}
