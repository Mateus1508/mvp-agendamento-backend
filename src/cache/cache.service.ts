import {
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import Redis from 'ioredis';
import { DEFAULT_CACHE_TTL_SECONDS } from './cache.constants';

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly client: Redis | null;
  private readonly ttlSeconds = Number.parseInt(
    process.env.REDIS_CACHE_TTL_SECONDS ?? String(DEFAULT_CACHE_TTL_SECONDS),
    10,
  );

  constructor() {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      this.client = null;
      this.logger.warn('REDIS_URL não configurada. Cache desabilitado.');
      return;
    }

    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });

    this.client.on('error', (error) => {
      this.logger.warn(`Redis indisponível: ${error.message}`);
    });

    void this.client.connect().catch((error: Error) => {
      this.logger.warn(`Não foi possível conectar ao Redis: ${error.message}`);
    });
  }

  isEnabled(): boolean {
    return this.client?.status === 'ready';
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client || this.client.status !== 'ready') {
      return null;
    }

    try {
      const value = await this.client.get(key);

      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.warn(
        `Falha ao ler cache (${key}): ${error instanceof Error ? error.message : 'erro desconhecido'}`,
      );
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = this.ttlSeconds): Promise<void> {
    if (!this.client || this.client.status !== 'ready') {
      return;
    }

    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
      this.logger.warn(
        `Falha ao gravar cache (${key}): ${error instanceof Error ? error.message : 'erro desconhecido'}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.client) {
      return;
    }

    await this.client.quit();
  }
}
