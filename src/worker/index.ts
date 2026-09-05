import { Worker } from 'bullmq';
import { config, isMockMode } from '@/lib/config';
import { ingestFromUrl, ingestUpload } from '@/lib/media/ingest';
import { prisma } from '@/lib/prisma';
import { resolveProviders } from '@/lib/providers';
import { createRedisConnection, RENDER_QUEUE, type RenderJobData } from '@/lib/queue';
import { clearWorkDir, ensureProjectDirs, fileSize, sourceDir } from '@/lib/storage';
import { startMaintenance } from './maintenance';
import { runReconstruct } from './pipeline/reconstruct';
import { runShorts } from './pipeline/shorts';
import type { PipelineContext } from './pipeline/types';

/**
 * Render worker. Runs as its own process (see docker-compose) because ffmpeg jobs
 * are long and CPU-bound — sharing them with the web server would stall requests.
 */

async function log(
  projectId: string,
  stage: string,
  message: string,
  level: 'info' | 'warn' | 'error' = 'info',
) {
  await prisma.projectEvent.create({
    data: { projectId, stage, message, level },
  });
}

async function processProject(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error(`프로젝트를 찾을 수 없습니다: ${projectId}`);
  if (project.status === 'CANCELLED') return;

  await prisma.project.update({
    where: { id: projectId },
    data: {
      status: 'RUNNING',
      startedAt: new Date(),
      progress: 5,
      stage: 'ingest',
      failureCode: null,
      failureHint: null,
    },
  });

  await ensureProjectDirs(projectId);
  const providers = resolveProviders();

  if (providers.usingMocks) {
    await log(
      projectId,
      'ingest',
      'API 키가 없어 목 모드로 처리합니다. 파이프라인은 그대로 동작하지만 대본과 음성은 예시입니다.',
      'warn',
    );
  }

  // --- Ingest ---------------------------------------------------------------
  await log(projectId, 'ingest', '원본을 준비합니다');
  const ingested =
    project.sourceKind === 'URL'
      ? await ingestFromUrl(project.sourceUrl!, sourceDir(projectId))
      : await ingestUpload(project.sourcePath!);

  await prisma.project.update({
    where: { id: projectId },
    data: {
      sourcePath: ingested.filePath,
      sourceDurationSec: ingested.info.durationSec,
      progress: 8,
    },
  });

  const ctx: PipelineContext = {
    // Re-read so the pipeline sees the ingest fields we just wrote.
    project: (await prisma.project.findUniqueOrThrow({ where: { id: projectId } })),
    sourcePath: ingested.filePath,
    setStage: async (stage, progress, message) => {
      await prisma.project.update({
        where: { id: projectId },
        data: { stage, progress },
      });
      await log(projectId, stage, message);
    },
    log: (stage, message, level) => log(projectId, stage, message, level),
  };

  const result =
    project.mode === 'RECONSTRUCT'
      ? await runReconstruct(ctx, providers)
      : await runShorts(ctx, providers);

  // --- Persist outputs ------------------------------------------------------
  await prisma.output.deleteMany({ where: { projectId } });
  for (const output of result.outputs) {
    await prisma.output.create({
      data: {
        projectId,
        kind: output.kind,
        label: output.label,
        path: output.path,
        mimeType: output.mimeType,
        bytes: await fileSize(output.path),
        durationSec: output.durationSec,
        width: output.width,
        height: output.height,
      },
    });
  }

  // Intermediates are large and nothing reads them after this point.
  await clearWorkDir(projectId);

  await prisma.project.update({
    where: { id: projectId },
    data: {
      status: 'COMPLETED',
      progress: 100,
      stage: 'done',
      completedAt: new Date(),
      title: result.title || project.title,
    },
  });
  await log(projectId, 'done', '완료되었습니다');
}

const worker = new Worker<RenderJobData>(
  RENDER_QUEUE,
  async (job) => processProject(job.data.projectId),
  {
    connection: createRedisConnection(),
    // ffmpeg saturates the CPU on its own; more than a couple in parallel just
    // makes every job slower.
    concurrency: Number(process.env.WORKER_CONCURRENCY ?? 2),
    lockDuration: 10 * 60 * 1000,
  },
);

worker.on('failed', async (job, error) => {
  if (!job?.data.projectId) return;
  const message = error?.message ?? '알 수 없는 오류';
  console.error(`[worker] ${job.data.projectId} failed:`, message);

  // Only mark the project failed once BullMQ has exhausted its retries.
  const attemptsLeft = (job.opts.attempts ?? 1) - job.attemptsMade;
  if (attemptsLeft > 0) return;

  await prisma.project
    .update({
      where: { id: job.data.projectId },
      data: {
        status: 'FAILED',
        stage: 'failed',
        failureCode: 'PIPELINE_ERROR',
        failureHint: message.slice(0, 500),
      },
    })
    .catch(() => undefined);
  await log(job.data.projectId, 'failed', message.slice(0, 500), 'error').catch(
    () => undefined,
  );
});

worker.on('completed', (job) => {
  console.log(`[worker] ${job.data.projectId} completed`);
});

console.log(
  `[worker] listening on ${RENDER_QUEUE} · redis=${config.redisUrl} · providers=${
    isMockMode ? 'mock' : 'live'
  }`,
);

// Reclaims disk from finished projects and clears anything a dead worker left
// stuck at RUNNING. Runs immediately, then hourly.
const stopMaintenance = startMaintenance();

async function shutdown(signal: string) {
  console.log(`[worker] ${signal} received, finishing in-flight jobs`);
  stopMaintenance();
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
