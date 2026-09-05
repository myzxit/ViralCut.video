import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const FFMPEG = process.env.FFMPEG_PATH ?? 'ffmpeg';
const FFPROBE = process.env.FFPROBE_PATH ?? 'ffprobe';

/** ffmpeg writes progress to stderr, so a non-zero exit is the only real failure signal. */
export async function runFfmpeg(args: string[]): Promise<void> {
  try {
    await execFileAsync(FFMPEG, ['-hide_banner', '-loglevel', 'error', ...args], {
      maxBuffer: 1024 * 1024 * 32,
    });
  } catch (error) {
    const stderr =
      error instanceof Error && 'stderr' in error
        ? String((error as { stderr?: unknown }).stderr ?? '')
        : '';
    throw new Error(
      `ffmpeg failed: ${stderr.trim().split('\n').slice(-4).join(' | ') || String(error)}`,
    );
  }
}

export type MediaInfo = {
  durationSec: number;
  width: number;
  height: number;
  hasAudio: boolean;
  /** Embedded subtitle streams can be dropped cleanly; burned-in text cannot. */
  subtitleStreamCount: number;
};

export async function probe(filePath: string): Promise<MediaInfo> {
  const { stdout } = await execFileAsync(FFPROBE, [
    '-v',
    'error',
    '-print_format',
    'json',
    '-show_format',
    '-show_streams',
    filePath,
  ]);

  const parsed = JSON.parse(stdout) as {
    format?: { duration?: string };
    streams?: {
      codec_type?: string;
      width?: number;
      height?: number;
    }[];
  };

  const streams = parsed.streams ?? [];
  const video = streams.find((s) => s.codec_type === 'video');

  return {
    durationSec: Math.round(Number(parsed.format?.duration ?? 0)),
    width: video?.width ?? 0,
    height: video?.height ?? 0,
    hasAudio: streams.some((s) => s.codec_type === 'audio'),
    subtitleStreamCount: streams.filter((s) => s.codec_type === 'subtitle').length,
  };
}

export async function extractAudio(input: string, output: string) {
  await runFfmpeg([
    '-i',
    input,
    '-vn',
    '-ac',
    '2',
    '-ar',
    '48000',
    '-c:a',
    'pcm_s16le',
    '-y',
    output,
  ]);
}

export type AspectRatio = '9:16' | '1:1' | '16:9';

const RATIO_DIMENSIONS: Record<AspectRatio, { width: number; height: number }> = {
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
  '16:9': { width: 1920, height: 1080 },
};

export function dimensionsFor(ratio: AspectRatio) {
  return RATIO_DIMENSIONS[ratio] ?? RATIO_DIMENSIONS['9:16'];
}

/**
 * Scale-and-crop to the target frame, biased toward the given horizontal focus
 * (0 = left edge, 0.5 = centre, 1 = right edge). Reframing a 16:9 talking head to
 * 9:16 by centre-crop alone regularly cuts the speaker in half, so the caller
 * passes a focus point from face tracking when it has one.
 */
export function reframeFilter(ratio: AspectRatio, focusX = 0.5) {
  const { width, height } = dimensionsFor(ratio);
  const clampedFocus = Math.min(1, Math.max(0, focusX));
  return [
    `scale=${width}:${height}:force_original_aspect_ratio=increase`,
    `crop=${width}:${height}:(iw-${width})*${clampedFocus.toFixed(3)}:(ih-${height})/2`,
    `setsar=1`,
  ].join(',');
}

/**
 * Filtergraph that blurs the band where burned-in subtitles usually sit.
 *
 * Pixels painted over by burned-in text are gone — there is no picture underneath to
 * recover — so removal is impossible. What we can do is blur that band into an
 * unreadable smear and lay the new subtitles on top of it.
 *
 * `band` is the fraction of frame height treated as the subtitle zone, measured up
 * from the bottom edge.
 */
export function subtitleMaskGraph(
  inputLabel: string,
  outputLabel: string,
  band = 0.22,
) {
  const clamped = Math.min(0.4, Math.max(0.08, band));
  const top = (1 - clamped).toFixed(4);
  return [
    `[${inputLabel}]split=2[vcmBase][vcmZone]`,
    `[vcmZone]crop=iw:ih*${clamped.toFixed(4)}:0:ih*${top},boxblur=luma_radius=28:luma_power=2[vcmBlur]`,
    `[vcmBase][vcmBlur]overlay=0:H*${top}[${outputLabel}]`,
  ].join(';');
}

export function escapeForFilter(value: string) {
  // ffmpeg filtergraphs treat these as syntax; paths and text must escape them.
  return value.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'");
}
