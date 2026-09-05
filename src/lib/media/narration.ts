import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { probe, runFfmpeg } from '@/lib/media/ffmpeg';
import type { SynthesizedSpeech } from '@/lib/providers/types';

/** Silence inserted between narration lines so speech does not run together. */
const GAP_SEC = 0.35;

/**
 * Join per-line TTS files into one narration track and report where each line
 * landed. The timings come from probing the rendered audio rather than from an
 * estimate, so subtitles stay locked to the voice even when a provider's pacing
 * differs from what we predicted.
 */
export async function concatNarration(
  linePaths: string[],
  lineTexts: string[],
  outDir: string,
): Promise<SynthesizedSpeech> {
  const durations = await Promise.all(
    linePaths.map(async (filePath) => (await probe(filePath)).durationSec),
  );

  let cursor = 0;
  const lineTimings = lineTexts.map((text, index) => {
    const timing = {
      startSec: cursor,
      endSec: cursor + durations[index],
      text,
    };
    cursor += durations[index] + GAP_SEC;
    return timing;
  });

  const audioPath = path.join(outDir, 'narration.wav');

  // Build a concat list with a silence file between each line.
  const silencePath = path.join(outDir, 'gap.wav');
  await runFfmpeg([
    '-f',
    'lavfi',
    '-i',
    'anullsrc=channel_layout=stereo:sample_rate=48000',
    '-t',
    String(GAP_SEC),
    '-c:a',
    'pcm_s16le',
    '-y',
    silencePath,
  ]);

  const listPath = path.join(outDir, 'narration-list.txt');
  const entries = linePaths.flatMap((filePath, index) =>
    index === linePaths.length - 1
      ? [`file '${filePath}'`]
      : [`file '${filePath}'`, `file '${silencePath}'`],
  );
  await writeFile(listPath, entries.join('\n'));

  await runFfmpeg([
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    listPath,
    '-ac',
    '2',
    '-ar',
    '48000',
    '-c:a',
    'pcm_s16le',
    '-y',
    audioPath,
  ]);

  return {
    audioPath,
    durationSec: Math.max(0, cursor - GAP_SEC),
    lineTimings,
  };
}
