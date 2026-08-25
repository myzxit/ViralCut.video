/**
 * Single place that reads process.env, so every other module takes plain values.
 * Nothing here throws at import time — a missing key means "fall back to the mock",
 * not "refuse to boot".
 */

function optional(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export const config = {
  databaseUrl: process.env.DATABASE_URL ?? '',
  redisUrl: process.env.REDIS_URL ?? 'redis://127.0.0.1:6379',

  /** Root for uploads, intermediates, and renders. */
  storageDir: process.env.STORAGE_DIR ?? './storage',
  publicBaseUrl: process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000',

  ytDlpPath: process.env.YTDLP_PATH ?? 'yt-dlp',

  providers: {
    openaiKey: optional('OPENAI_API_KEY'),
    openaiBaseUrl: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
    anthropicKey: optional('ANTHROPIC_API_KEY'),
    elevenLabsKey: optional('ELEVENLABS_API_KEY'),
    /** Set to `1` to force mocks even when keys are present — useful for local runs. */
    forceMock: process.env.FORCE_MOCK_PROVIDERS === '1',
  },

  limits: {
    maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES ?? 2 * 1024 * 1024 * 1024),
    /** Longest source we will ingest, so one job cannot occupy a worker forever. */
    maxSourceSeconds: Number(process.env.MAX_SOURCE_SECONDS ?? 4 * 60 * 60),
    /** Retention for source and intermediate files, in days. */
    retentionDays: Number(process.env.RETENTION_DAYS ?? 14),
  },
} as const;

export const isMockMode =
  config.providers.forceMock ||
  (!config.providers.openaiKey && !config.providers.anthropicKey);
