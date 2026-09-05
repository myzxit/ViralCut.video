import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '@/lib/config';

export const RENDER_QUEUE = 'viralcut-render';

export type RenderJobData = {
  projectId: string;
};

export function createRedisConnection() {
  return new IORedis(config.redisUrl, {
    // BullMQ blocks on Redis commands; retrying forever is its documented requirement.
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

const globalForQueue = globalThis as unknown as { renderQueue?: Queue<RenderJobData> };

export function getRenderQueue() {
  if (!globalForQueue.renderQueue) {
    globalForQueue.renderQueue = new Queue<RenderJobData>(RENDER_QUEUE, {
      connection: createRedisConnection(),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 15_000 },
        removeOnComplete: { age: 60 * 60 * 24 },
        removeOnFail: { age: 60 * 60 * 24 * 7 },
      },
    });
  }
  return globalForQueue.renderQueue;
}

export async function enqueueRender(projectId: string) {
  // The project id doubles as the job id so a double-submit cannot queue twice.
  await getRenderQueue().add('render', { projectId }, { jobId: projectId });
}
