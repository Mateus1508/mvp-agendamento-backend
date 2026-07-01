import {
  COMPANY_SEGMENTS,
  CompanySegment,
} from '../auth/constants/company-segments';

const SEGMENT_KEYWORDS: Partial<Record<CompanySegment, string[]>> = {
  'Beleza e Estética': [
    'beleza',
    'estética',
    'estetica',
    'cabelo',
    'manicure',
    'salão',
    'salao',
    'barbearia',
    'make',
  ],
  Saúde: [
    'saúde',
    'saude',
    'médico',
    'medico',
    'consulta',
    'clínica',
    'clinica',
    'dentista',
    'hospital',
  ],
  'Fitness e Bem-estar': [
    'fitness',
    'academia',
    'personal',
    'yoga',
    'pilates',
    'bem-estar',
    'bem estar',
  ],
  Educação: [
    'educação',
    'educacao',
    'aula',
    'curso',
    'professor',
    'reforço',
    'reforco',
    'escola',
  ],
  Consultoria: ['consultoria', 'consultor', 'assessoria', 'coaching'],
  Tecnologia: [
    'tecnologia',
    'celular',
    'smartphone',
    'computador',
    'notebook',
    'tablet',
    'consertar',
    'reparo',
    'assistência técnica',
    'assistencia tecnica',
    'ti',
    'software',
  ],
  Alimentação: [
    'alimentação',
    'alimentacao',
    'restaurante',
    'comida',
    'delivery',
    'café',
    'cafe',
  ],
  'Serviços Gerais': [
    'serviço',
    'servico',
    'manutenção',
    'manutencao',
    'limpeza',
    'reforma',
  ],
};

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function resolveSegmentFromText(text: string): CompanySegment | null {
  const normalized = normalizeText(text);

  for (const segment of COMPANY_SEGMENTS) {
    if (normalized.includes(normalizeText(segment))) {
      return segment;
    }
  }

  for (const segment of COMPANY_SEGMENTS) {
    const keywords = SEGMENT_KEYWORDS[segment];

    if (!keywords) {
      continue;
    }

    if (keywords.some((keyword) => normalized.includes(normalizeText(keyword)))) {
      return segment;
    }
  }

  return null;
}

export function resolveSegmentFromConversation(
  message: string,
  history?: Array<{ role: string; content: string }>,
): CompanySegment | null {
  const texts = [message];

  if (history?.length) {
    texts.push(...history.map((item) => item.content));
  }

  for (const text of texts.reverse()) {
    const segment = resolveSegmentFromText(text);

    if (segment) {
      return segment;
    }
  }

  return null;
}

export function buildCachedDiscoveryReply(
  segment: string,
  companiesCount: number,
): string {
  if (companiesCount === 0) {
    return `No momento não encontrei empresas disponíveis no segmento ${segment}. Quer tentar outro tipo de serviço?`;
  }

  const label =
    companiesCount === 1
      ? '1 empresa disponível'
      : `${companiesCount} empresas disponíveis`;

  return `Encontrei ${label} no segmento ${segment}. Confira as opções abaixo.`;
}
