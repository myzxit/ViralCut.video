/**
 * End-to-end check of the render path with no database, queue, or API keys.
 *
 * Synthesizes a source video, runs both pipelines against it with the mock
 * providers, and asserts that real files come out with sane durations. This is the
 * fastest way to tell whether an ffmpeg change broke rendering.
 *
 *   STORAGE_DIR=/tmp/vc-smoke npx tsx scripts/smoke-pipeline.ts
 */

import assert from 'node:assert/strict';
import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import type { Project } from '@prisma/client';
import { probe, runFfmpeg } from '../src/lib/media/ffmpeg';
import { resolveProviders } from '../src/lib/providers';
import { ensureProjectDirs, outputDir, sourceDir } from '../src/lib/storage';
import { runReconstruct } from '../src/worker/pipeline/reconstruct';
import { runShorts } from '../src/worker/pipeline/shorts';
import type { PipelineContext } from '../src/worker/pipeline/types';

const SOURCE_SECONDS = 240;

async function makeSourceVideo(destDir: string) {
  await mkdir(destDir, { recursive: true });
  const filePath = path.join(destDir, 'source.mp4');

  // 4 minutes of moving test pattern with a tone, so both the picture and audio
  // paths have something real to chew on.
  await runFfmpeg([
    '-f',
    'lavfi',
    '-i',
    `testsrc=size=1280x720:rate=30:duration=${SOURCE_SECONDS}`,
    '-f',
    'lavfi',
    '-i',
    `sine=frequency=320:duration=${SOURCE_SECONDS}`,
    '-c:v',
    'libx264',
    '-preset',
    'ultrafast',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-shortest',
    '-y',
    filePath,
  ]);

  return filePath;
}

function fakeProject(overrides: Partial<Project>): Project {
  return {
    id: 'smoke',
    userId: 'smoke-user',
    mode: 'RECONSTRUCT',
    status: 'RUNNING',
    title: 'smoke',
    sourceKind: 'UPLOAD',
    sourceUrl: null,
    sourcePath: null,
    sourceDurationSec: SOURCE_SECONDS,
    targetMinutes: 2,
    voiceId: null,
    speechRate: 'normal',
    captionStyle: 'clean',
    aspectRatio: '9:16',
    language: 'ko',
    progress: 0,
    stage: null,
    failureCode: null,
    failureHint: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    startedAt: null,
    completedAt: null,
    ...overrides,
  } as Project;
}

function makeContext(project: Project, sourcePath: string): PipelineContext {
  return {
    project,
    sourcePath,
    setStage: async (stage, progress, message) => {
      console.log(`  [${String(progress).padStart(3)}%] ${stage} — ${message}`);
    },
    log: async (stage, message) => {
      console.log(`         · ${stage}: ${message}`);
    },
  };
}

async function main() {
  const providers = resolveProviders();
  assert.equal(providers.usingMocks, true, 'smoke test expects mock providers');

  console.log('source: rendering a test video...');
  const sourcePath = await makeSourceVideo(sourceDir('smoke'));
  const sourceInfo = await probe(sourcePath);
  console.log(`source: ${sourceInfo.width}x${sourceInfo.height}, ${sourceInfo.durationSec}s\n`);

  // --- reconstruct ---------------------------------------------------------
  console.log('reconstruct pipeline:');
  const reconstructProject = fakeProject({ id: 'smoke', targetMinutes: 2 });
  await ensureProjectDirs('smoke');
  const reconstructResult = await runReconstruct(
    makeContext(reconstructProject, sourcePath),
    providers,
  );

  const video = reconstructResult.outputs.find((output) => output.kind === 'VIDEO');
  assert.ok(video, 'reconstruct produced no video');
  const videoInfo = await probe(video.path);

  assert.ok(videoInfo.durationSec > 0, 'reconstructed video has no duration');
  assert.ok(videoInfo.hasAudio, 'reconstructed video has no audio track');
  assert.equal(videoInfo.width, 1080, 'reconstructed video is not 1080 wide');
  assert.equal(videoInfo.height, 1920, 'reconstructed video is not 9:16');

  // The runtime should land near the requested 2 minutes. Narration pacing makes an
  // exact match impossible, so allow a generous band and just catch gross errors.
  const targetSec = 2 * 60;
  const drift = Math.abs(videoInfo.durationSec - targetSec) / targetSec;
  assert.ok(
    drift < 0.5,
    `reconstructed runtime ${videoInfo.durationSec}s is too far from ${targetSec}s`,
  );

  assert.ok(
    reconstructResult.outputs.some((output) => output.kind === 'SUBTITLE'),
    'reconstruct produced no subtitle file',
  );
  assert.ok(
    reconstructResult.outputs.some((output) => output.kind === 'TRANSCRIPT'),
    'reconstruct produced no script file',
  );

  console.log(
    `  -> ${path.basename(video.path)} ${videoInfo.width}x${videoInfo.height} ${videoInfo.durationSec}s (target ${targetSec}s)\n`,
  );

  // --- shorts --------------------------------------------------------------
  console.log('shorts pipeline:');
  const shortsProject = fakeProject({
    id: 'smoke-shorts',
    mode: 'SHORTS',
    targetMinutes: null,
  });
  await ensureProjectDirs('smoke-shorts');
  const shortsResult = await runShorts(
    makeContext(shortsProject, sourcePath),
    providers,
  );

  const clips = shortsResult.outputs.filter((output) => output.kind === 'VIDEO');
  assert.ok(clips.length > 0, 'shorts pipeline produced no clips');

  for (const clip of clips) {
    const info = await probe(clip.path);
    assert.ok(info.durationSec > 0, `${clip.label} has no duration`);
    assert.equal(info.width, 1080, `${clip.label} is not 1080 wide`);
    assert.ok(info.durationSec <= 60, `${clip.label} is longer than a short`);
  }

  console.log(`  -> ${clips.length} clips rendered\n`);

  const written = await readdir(outputDir('smoke'));
  console.log('outputs:', written.join(', '));
  console.log('\nOK — both pipelines produced valid media.');
}

main().catch((error) => {
  console.error('\nFAILED:', error instanceof Error ? error.message : error);
  process.exit(1);
});
