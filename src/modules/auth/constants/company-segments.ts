export const COMPANY_SEGMENTS = [
  'Beleza e Estética',
  'Saúde',
  'Fitness e Bem-estar',
  'Educação',
  'Consultoria',
  'Tecnologia',
  'Alimentação',
  'Serviços Gerais',
  'Outro',
] as const;

export type CompanySegment = (typeof COMPANY_SEGMENTS)[number];
