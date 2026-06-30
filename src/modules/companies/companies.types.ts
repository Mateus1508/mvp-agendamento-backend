import { CompanyAuthUser } from '../auth/auth.types';

export type CompanyOnboardingResponse = {
  id: string;
  slug: string;
  name: string;
  segment: string;
  tradeName: string | null;
  legalName: string | null;
  cnpj: string | null;
  phone: string | null;
  whatsapp: string | null;
  supportEmail: string | null;
  website: string | null;
  onboardingStep: number;
  onboardingCompletedAt: string | null;
  bookingUrl: string;
  address: {
    zipCode: string;
    street: string;
    number: string;
    complement: string | null;
    city: string;
    state: string;
  } | null;
  businessHours: Array<{
    dayOfWeek: string;
    enabled: boolean;
    startTime: string | null;
    endTime: string | null;
  }>;
  employees: Array<{
    id: string;
    name: string;
    specialty: string;
    schedule: string | null;
    googleCalendarConnected: boolean;
    active: boolean;
  }>;
  services: Array<{
    id: string;
    name: string;
    priceMin: number;
    priceMax: number;
    description: string | null;
  }>;
  agentConfig: {
    agentName: string;
    personality: string;
    initialMessage: string;
    customInstructions: string | null;
  } | null;
  calendarConnected: boolean;
};

export type CompanyRequestUser = CompanyAuthUser;
