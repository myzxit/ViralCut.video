import { createReadStream } from 'node:fs';
import { mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { config } from '@/lib/config';

/**
 * Filesystem layout, one directory per project:
 *
 *   storage/projects/<id>/source/     the ingested original
 *   storage/projects/<id>/work/       stems, narration, subtitle files
 *   storage/projects/<id>/output/     what the user downloads
 *
 * Outputs are served through an authenticated route rather than a static mount, so
 * one user cannot read another's renders by guessing an id.
 */

const ROOT = path.resolve(config.storageDir);

export function projectDir(projectId: string) {
  // Ids come from cuid(), but treat them as untrusted anyway — a `..` here would
  // otherwise let a crafted id walk out of the storage root.
  const safe = path.basename(projectId);
  return path.join(ROOT, 'projects', safe);
}

export function sourceDir(projectId: string) {
  return path.join(projectDir(projectId), 'source');
}

export function workDir(projectId: string) {
  return path.join(projectDir(projectId), 'work');
}

export function outputDir(projectId: string) {
  return path.join(projectDir(projectId), 'output');
}

export async function ensureProjectDirs(projectId: string) {
  await Promise.all([
    mkdir(sourceDir(projectId), { recursive: true }),
    mkdir(workDir(projectId), { recursive: true }),
    mkdir(outputDir(projectId), { recursive: true }),
  ]);
}

/** Intermediates are large and worthless once the render lands. */
export async function clearWorkDir(projectId: string) {
  await rm(workDir(projectId), { recursive: true, force: true });
}

export async function removeProjectFiles(projectId: string) {
  await rm(projectDir(projectId), { recursive: true, force: true });
}

/** Rejects any path that resolves outside the storage root. */
export function assertInsideStorage(filePath: string) {
  const resolved = path.resolve(filePath);
  if (resolved !== ROOT && !resolved.startsWith(ROOT + path.sep)) {
    throw new Error('경로가 저장소 밖을 가리킵니다.');
  }
  return resolved;
}

export async function fileSize(filePath: string) {
  try {
    return (await stat(filePath)).size;
  } catch {
    return 0;
  }
}

export function readStream(filePath: string) {
  return createReadStream(assertInsideStorage(filePath));
}
