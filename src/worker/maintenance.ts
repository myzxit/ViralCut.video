import { rm } from 'node:fs/promises';
import { config } from '@/lib/config';
import { prisma } from '@/lib/prisma';
import { getRenderQueue } from '@/lib/queue';
import { sourceDir, workDir } from '@/lib/storage';

/**
 * Housekeeping the worker runs on boot and then on a timer.
 *
 * Two jobs: reclaim disk from finished projects, and clear projects left stranded
 * mid-render when a worker died. Both are idempotent, so overlapping runs across
 * several workers are harmless.
 */

/** BullMQ holds a 10-minute lock; anything quiet for far longer has no owner. */
const STALE_AFTER_MS = 30 * 60 * 1000;

/**
 * Delete the source upload and intermediates for projects that finished long
 * enough ago. Rendered outputs are kept — those are what the user came for; it is
 * the multi-gigabyte originals and scratch files that need reclaiming.
 *
 * The FAQ and README both promise this happens, so it has to actually run.
 */
export async function sweepExpiredMedia(): Promise<number> {
  const cutoff = new Date(Date.now() - config.limits.retentionDays * 86_400_000);

  const expired = await prisma.project.findMany({
    where: {
      status: { in: ['COMPLETED', 'FAILED', 'CANCELLED'] },
      updatedAt: { lt: cutoff },
      // Once the source path is cleared we know this project was already swept.
      sourcePath: { not: null },
    },
    select: { id: true },
    take: 200,
  });

  for (const project of expired) {
    await rm(sourceDir(project.id), { recursive: true, force: true });
    await rm(workDir(project.id), { recursive: true, force: true });
    await prisma.project.update({
      where: { id: project.id },
      data: { sourcePath: null },
    });
  }

  return expired.length;
}

/**
 * A worker killed mid-render (OOM, redeploy, host reboot) leaves its project at
 * RUNNING forever, and the UI shows a progress bar that never moves. Find those
 * and fail them so the user can retry instead of waiting on nothing.
 */
export async function failStrandedProjects(): Promise<number> {
  const stranded = await prisma.project.findMany({
    where: {
      status: { in: ['RUNNING', 'QUEUED'] },
      updatedAt: { lt: new Date(Date.now() - STALE_AFTER_MS) },
    },
    select: { id: true },
    take: 200,
  });

  if (!stranded.length) return 0;

  const queue = getRenderQueue();
  let failed = 0;

  for (const project of stranded) {
    // Still owned by a live job? Leave it alone — a long render is not stranded.
    const job = await queue.getJob(project.id).catch(() => null);
    if (job) {
      const state = await job.getState().catch(() => 'unknown');
      if (state === 'active' || state === 'waiting' || state === 'delayed') continue;
    }

    await prisma.project.update({
      where: { id: project.id },
      data: {
        status: 'FAILED',
        stage: 'failed',
        failureCode: 'WORKER_LOST',
        failureHint:
          '처리 도중 작업이 중단되었습니다. 다시 시도해 주세요. 반복되면 더 짧은 길이로 시도해 보세요.',
      },
    });
    await prisma.projectEvent.create({
      data: {
        projectId: project.id,
        stage: 'failed',
        level: 'error',
        message: '작업을 처리하던 프로세스가 사라져 실패로 정리했습니다.',
      },
    });
    failed += 1;
  }

  return failed;
}

export async function runMaintenance() {
  try {
    const [swept, failed] = await Promise.all([
      sweepExpiredMedia(),
      failStrandedProjects(),
    ]);
    if (swept || failed) {
      console.log(
        `[maintenance] reclaimed ${swept} project(s), failed ${failed} stranded`,
      );
    }
  } catch (error) {
    // Housekeeping must never take the worker down with it.
    console.error('[maintenance] sweep failed:', error);
  }
}

/** Runs once now, then hourly. Returns a stop function for shutdown. */
export function startMaintenance(intervalMs = 60 * 60 * 1000) {
  void runMaintenance();
  const timer = setInterval(() => void runMaintenance(), intervalMs);
  // Do not hold the process open for the next sweep.
  timer.unref();
  return () => clearInterval(timer);
}
