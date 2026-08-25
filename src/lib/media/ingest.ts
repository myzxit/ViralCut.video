import { execFile } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { config } from '@/lib/config';
import { probe, type MediaInfo } from '@/lib/media/ffmpeg';
import { isLikelyVideoUrl } from '@/lib/video-url';

const execFileAsync = promisify(execFile);

export type IngestResult = { filePath: string; info: MediaInfo; title?: string };

/**
 * Download a source video into the project's source directory.
 *
 * Only the user's own uploads and links they supply are fetched. Whether a given
 * link may be downloaded is the user's responsibility — the terms shown at upload
 * say so — so this does no rights checking of its own.
 */
export async function ingestFromUrl(
  url: string,
  destDir: string,
): Promise<IngestResult> {
  if (!isLikelyVideoUrl(url)) {
    throw new Error('지원하지 않는 주소입니다.');
  }

  const template = path.join(destDir, 'source.%(ext)s');

  try {
    await execFileAsync(
      config.ytDlpPath,
      [
        // Cap the pull at 1080p: nothing downstream renders above it, and 4K sources
        // multiply download time and disk for no visible gain.
        '-f',
        'bv*[height<=1080]+ba/b[height<=1080]/b',
        '--merge-output-format',
        'mp4',
        '--no-playlist',
        '--no-progress',
        '--restrict-filenames',
        '-o',
        template,
        url,
      ],
      { maxBuffer: 1024 * 1024 * 16, timeout: 30 * 60 * 1000 },
    );
  } catch (error) {
    const stderr =
      error instanceof Error && 'stderr' in error
        ? String((error as { stderr?: unknown }).stderr ?? '')
        : String(error);
    throw new Error(`영상을 내려받지 못했습니다: ${stderr.slice(-300)}`);
  }

  const entries = await readdir(destDir);
  const downloaded = entries.find((name) => name.startsWith('source.'));
  if (!downloaded) {
    throw new Error('내려받은 파일을 찾을 수 없습니다.');
  }

  const filePath = path.join(destDir, downloaded);
  const info = await probe(filePath);
  assertUsable(info);
  return { filePath, info };
}

export async function ingestUpload(filePath: string): Promise<IngestResult> {
  const info = await probe(filePath);
  assertUsable(info);
  return { filePath, info };
}

function assertUsable(info: MediaInfo) {
  if (!info.durationSec || info.durationSec < 5) {
    throw new Error('영상이 너무 짧거나 재생 정보를 읽을 수 없습니다.');
  }
  if (info.durationSec > config.limits.maxSourceSeconds) {
    const hours = Math.round(config.limits.maxSourceSeconds / 3600);
    throw new Error(`영상이 너무 깁니다. 최대 ${hours}시간까지 처리합니다.`);
  }
  if (!info.width || !info.height) {
    throw new Error('영상 트랙을 찾을 수 없습니다.');
  }
}
