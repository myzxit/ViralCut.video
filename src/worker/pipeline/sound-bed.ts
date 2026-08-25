import path from 'node:path';
import { runFfmpeg } from '@/lib/media/ffmpeg';

/**
 * Build the replacement soundtrack: new music and effects sitting under the new
 * narration. None of the original audio reaches this stage — the reconstruct
 * pipeline discarded both stems before calling here.
 *
 * Effects are synthesized rather than sampled so the project ships with no audio
 * assets and no licensing to track. Swapping in a real library means replacing
 * `cueSource` with file inputs; nothing else changes.
 */

export type SoundCue = { atSec: number; kind?: string };

/** A short synthesized tone standing in for a transition or emphasis hit. */
function cueSource(kind: string | undefined, atSec: number) {
  const frequency = kind === 'emphasis' ? 880 : 440;
  const duration = kind === 'emphasis' ? 0.22 : 0.4;
  return {
    input: `sine=frequency=${frequency}:duration=${duration}`,
    delayMs: Math.max(0, Math.round(atSec * 1000)),
    gain: kind === 'emphasis' ? 0.12 : 0.08,
  };
}

export async function buildSoundBed({
  narrationPath,
  cues,
  totalSec,
  outDir,
}: {
  narrationPath: string;
  cues: SoundCue[];
  totalSec: number;
  outDir: string;
}): Promise<string> {
  const outPath = path.join(outDir, 'mixed.wav');

  const activeCues = cues.filter((cue) => cue.kind).slice(0, 40);

  const inputs: string[] = ['-i', narrationPath];
  const filters: string[] = [];
  const mixLabels: string[] = ['[narr]'];

  // Narration sits at the front of the mix; a gentle compressor keeps it even.
  // ffmpeg lets each filter output be consumed exactly once, and the narration is
  // needed twice — in the mix, and as the sidechain key for the pad — hence asplit.
  filters.push(
    '[0:a]acompressor=threshold=-18dB:ratio=3:attack=20:release=250,volume=1.0,asplit=2[narr][narrkey]',
  );

  // A quiet pad underneath. Ducked against the narration so speech always wins.
  inputs.push('-f', 'lavfi', '-i', `sine=frequency=196:duration=${totalSec.toFixed(2)}`);
  filters.push('[1:a]volume=0.035,aformat=channel_layouts=stereo[bed]');

  activeCues.forEach((cue, index) => {
    const source = cueSource(cue.kind, cue.atSec);
    const inputIndex = index + 2;
    inputs.push('-f', 'lavfi', '-i', source.input);
    filters.push(
      `[${inputIndex}:a]adelay=${source.delayMs}|${source.delayMs},volume=${source.gain},aformat=channel_layouts=stereo[sfx${index}]`,
    );
    mixLabels.push(`[sfx${index}]`);
  });

  // Sidechain the pad against narration so it drops whenever the voice is speaking.
  filters.push(
    '[bed][narrkey]sidechaincompress=threshold=0.05:ratio=8:attack=25:release=300[duckedbed]',
  );
  mixLabels.push('[duckedbed]');

  filters.push(
    `${mixLabels.join('')}amix=inputs=${mixLabels.length}:duration=first:normalize=0,` +
      `alimiter=limit=0.95,aresample=48000[out]`,
  );

  await runFfmpeg([
    ...inputs,
    '-filter_complex',
    filters.join(';'),
    '-map',
    '[out]',
    '-t',
    totalSec.toFixed(3),
    '-c:a',
    'pcm_s16le',
    '-y',
    outPath,
  ]);

  return outPath;
}
