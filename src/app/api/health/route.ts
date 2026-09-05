import IORedis from 'ioredis';
import { NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Liveness for the container orchestrator and for anyone debugging a deploy.
 *
 * Reports the two dependencies that make the app useless when they are down, and
 * returns 503 if either is unreachable so a healthcheck actually fails instead of
 * reporting a green container that cannot serve a request.
 */
/** A dependency that never answers is as broken as one that refuses. */
const PROBE_TIMEOUT_MS = 3000;

function withTimeout<T>(work: Promise<T>, label: string): Promise<T> {
  return Promise.race([
    work,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} did not respond in ${PROBE_TIMEOUT_MS}ms`)),
        PROBE_TIMEOUT_MS,
      ),
    ),
  ]);
}

export async function GET() {
  const checks: Record<string, 'ok' | string> = {};

  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, 'database');
    checks.database = 'ok';
  } catch (error) {
    checks.database = error instanceof Error ? error.message.slice(0, 120) : 'error';
  }

  // A short-lived connection of its own: reusing the queue's would report healthy
  // off a pooled socket even when new connections are being refused. It also must
  // not inherit BullMQ's retry-forever settings — with those, a ping against a
  // dead Redis never rejects and this handler hangs instead of reporting 503.
  const redis = new IORedis(config.redisUrl, {
    lazyConnect: true,
    connectTimeout: PROBE_TIMEOUT_MS,
    commandTimeout: PROBE_TIMEOUT_MS,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
    enableOfflineQueue: false,
  });
  // ioredis emits 'error' on a failed connect; without a listener that is an
  // unhandled event and takes the process down.
  redis.on('error', () => undefined);

  try {
    await withTimeout(redis.connect().then(() => redis.ping()), 'redis');
    checks.redis = 'ok';
  } catch (error) {
    checks.redis = error instanceof Error ? error.message.slice(0, 120) : 'error';
  } finally {
    redis.disconnect();
  }

  const healthy = Object.values(checks).every((value) => value === 'ok');

  return NextResponse.json(
    { status: healthy ? 'ok' : 'degraded', checks },
    { status: healthy ? 200 : 503 },
  );
}
