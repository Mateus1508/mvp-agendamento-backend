export const CACHE_KEYS = {
  companiesBySegment: (segment: string) =>
    `mvp:companies:segment:${segment}`,
  discoveryBySegment: (segment: string) =>
    `mvp:discovery:segment:${segment}`,
} as const;

export const DEFAULT_CACHE_TTL_SECONDS = 3600;
