import { mkdir, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { probe, runFfmpeg } from '@/lib/media/ffmpeg';

/**
 * Audio preparation for speech-to-text.
 *
 * The pipeline works in 48 kHz stereo PCM, which is right for mixing but ~11.5 MB
 * per minute — past a couple of minutes that exceeds what transcription endpoints
 * accept in one upload. Speech recognition gains nothing from the extra bandwidth
 * or the second channel, so we downmix to 16 kHz mono MP3 (~0.24 MB/min) and, for
 * sources long enough to still be too big, split into chunks the caller stitches
 * back together.
 */

/** Most hosted transcription endpoints cap uploads at 25 MB; stay well inside it. */
export const TRANSCRIPTION_UPLOAD_LIMIT_BYTES = 20 * 1024 * 1024;

/** 16 kHz mono at 32 kbps — the range speech models are trained on. */
const TARGET_BITRATE_KBPS = 32;

/**
 * At 32 kbps one minute is ~240 KB, so 30 minutes is ~7 MB: comfortably under the
 * limit, and small enough that one failed chunk is cheap to retry.
 */
const CHUNK_SECONDS = 30 * 60;

export type AudioChunk = {
  filePath: string;
  /** Seconds from the start of the original audio, for shifting timestamps back. */
  offsetSec: number;
  durationSec: number;
};

/** Downmix to the compact form transcription wants. */
export async function toTranscriptionAudio(
  inputPath: string,
  outDir: string,
): Promise<string> {
  await mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, 'transcribe.mp3');
  await runFfmpeg([
    '-i',
    inputPath,
    '-vn',
    '-ac',
    '1',
    '-ar',
    '16000',
    '-c:a',
    'libmp3lame',
    '-b:a',
    `${TARGET_BITRATE_KBPS}k`,
    '-y',
    outPath,
  ]);
  return outPath;
}

/**
 * Prepare audio for transcription, splitting it when one upload would be too
 * large. Returns chunks in order, each with the offset it starts at.
 */
export async function prepareTranscriptionChunks(
  inputPath: string,
  outDir: string,
): Promise<AudioChunk[]> {
  const compact = await toTranscriptionAudio(inputPath, outDir);
  const { size } = await stat(compact);
  const info = await probe(compact);

  if (size <= TRANSCRIPTION_UPLOAD_LIMIT_BYTES) {
    return [{ filePath: compact, offsetSec: 0, durationSec: info.durationSec }];
  }

  const chunkDir = path.join(outDir, 'transcribe-chunks');
  await mkdir(chunkDir, { recursive: true });

  await runFfmpeg([
    '-i',
    compact,
    '-f',
    'segment',
    '-segment_time',
    String(CHUNK_SECONDS),
    // Re-encoding would shift timestamps we later add offsets to; copy keeps them exact.
    '-c',
    'copy',
    '-reset_timestamps',
    '1',
    '-y',
    path.join(chunkDir, 'part-%03d.mp3'),
  ]);

  const names = (await readdir(chunkDir)).filter((n) => n.endsWith('.mp3')).sort();
  if (!names.length) throw new Error('오디오를 분할하지 못했습니다.');

  // Accumulate measured durations rather than assuming every chunk is exactly
  // CHUNK_SECONDS — the muxer cuts on frame boundaries and the drift compounds.
  const chunks: AudioChunk[] = [];
  let offsetSec = 0;
  for (const name of names) {
    const filePath = path.join(chunkDir, name);
    const chunkInfo = await probe(filePath);
    chunks.push({ filePath, offsetSec, durationSec: chunkInfo.durationSec });
    offsetSec += chunkInfo.durationSec;
  }

  return chunks;
}
