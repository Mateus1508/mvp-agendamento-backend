import { PublicCompanySummary } from '../companies/companies.types';

export type CachedDiscoveryResponse = {
  reply: string;
  companies: PublicCompanySummary[];
};
