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

export type CompanyDashboardResponse = {
  companyName: string;
  totalCustomers: number;
  totalAppointments: number;
  completedAppointments: number;
  upcomingAppointments: number;
  appointmentsThisMonth: number;
  totalRevenue: number;
  revenueThisMonth: number;
  averageTicket: number;
  activeEmployees: number;
  servicesCount: number;
};

export type PublicCompanySummary = {
  id: string;
  slug: string;
  name: string;
  segment: string;
  city: string | null;
  state: string | null;
  servicesPreview: string[];
  bookingUrl: string;
};

export type PublicCompanyService = {
  id: string;
  name: string;
  priceMin: number;
  priceMax: number;
  description: string | null;
};

export type PublicCompanyAddress = {
  zipCode: string;
  street: string;
  number: string;
  complement: string | null;
  city: string;
  state: string;
};

export type PublicCompanyBooking = {
  id: string;
  slug: string;
  name: string;
  segment: string;
  city: string | null;
  state: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: PublicCompanyAddress | null;
  services: PublicCompanyService[];
};

export type ClientBookingConfirmation = {
  appointmentId: string;
  date: string;
  time: string;
  serviceName: string | null;
  company: {
    name: string;
    segment: string;
    phone: string | null;
    whatsapp: string | null;
    address: PublicCompanyAddress | null;
  };
};

export type DayAvailability = {
  date: string;
  label: string;
  slots: string[];
};

export type CompanyAvailabilityResponse = {
  days: DayAvailability[];
};
