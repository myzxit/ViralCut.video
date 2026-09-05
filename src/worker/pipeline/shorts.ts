import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  dimensionsFor,
  escapeForFilter,
  extractAudio,
  probe,
  reframeFilter,
  runFfmpeg,
  type AspectRatio,
} from '@/lib/media/ffmpeg';
import { toAss, toSrt, type CaptionStyle, type Cue } from '@/lib/media/subtitles';
import type { ProviderBundle } from '@/lib/providers/types';
import { outputDir, workDir } from '@/lib/storage';
import type { PipelineContext, PipelineOutput, PipelineResult } from './types';

const MAX_CLIP_SECONDS = 59;

/**
 * Shorts pipeline: find self-contained highlight windows in the source and cut each
 * one into a vertical clip with captions taken from the original speech.
 *
 * Unlike reconstruct, this keeps the original audio — the point is to surface what
 * was actually said, not to replace it.
 */
export async function runShorts(
  ctx: PipelineContext,
  providers: ProviderBundle,
): Promise<PipelineResult> {
  const { project, sourcePath } = ctx;
  const work = workDir(project.id);
  const out = outputDir(project.id);

  const ratio = (project.aspectRatio ?? '9:16') as AspectRatio;
  const captionStyle = (project.captionStyle ?? 'clean') as CaptionStyle;
  const language = project.language ?? 'ko';

  await ctx.setStage('transcribe', 20, '음성을 받아씁니다');
  const audioPath = path.join(work, 'source.wav');
  await extractAudio(sourcePath, audioPath);
  const transcript = await providers.stt.transcribe({ audioPath, language });

  await ctx.setStage('select', 45, '하이라이트 구간을 고릅니다');
  const clips = await providers.writer.selectHighlights({
    transcript,
    maxClipSeconds: MAX_CLIP_SECONDS,
    language,
  });

  if (!clips.length) {
    throw new Error(
      '단독으로 쓸 만한 구간을 찾지 못했습니다. 더 긴 영상이나 말이 많은 영상으로 시도해 보세요.',
    );
  }

  const { width, height } = dimensionsFor(ratio);
  const outputs: PipelineOutput[] = [];

  for (const [index, clip] of clips.entries()) {
    const progress = 50 + Math.round((index / clips.length) * 45);
    await ctx.setStage('render', progress, `${index + 1}/${clips.length}번째 쇼츠를 만듭니다`);

    // Captions come from the source transcript, shifted to start at the clip's zero.
    const cues: Cue[] = transcript.segments
      .filter(
        (segment) => segment.endSec > clip.startSec && segment.startSec < clip.endSec,
      )
      .map((segment) => ({
        startSec: Math.max(0, segment.startSec - clip.startSec),
        endSec: Math.min(clip.endSec - clip.startSec, segment.endSec - clip.startSec),
        text: segment.text,
      }))
      .filter((cue) => cue.endSec > cue.startSec);

    const assPath = path.join(work, `clip-${index}.ass`);
    await writeFile(
      assPath,
      toAss(cues, { style: captionStyle, width, height }),
      'utf8',
    );

    const srtPath = path.join(out, `clip-${index + 1}.srt`);
    await writeFile(srtPath, toSrt(cues), 'utf8');

    const clipPath = path.join(out, `clip-${index + 1}.mp4`);
    await runFfmpeg([
      '-ss',
      clip.startSec.toFixed(3),
      '-t',
      (clip.endSec - clip.startSec).toFixed(3),
      '-i',
      sourcePath,
      '-vf',
      `${reframeFilter(ratio)},subtitles='${escapeForFilter(assPath)}'`,
      '-af',
      // Even out level differences between quiet and loud passages of the source.
      'loudnorm=I=-16:TP=-1.5:LRA=11',
      '-r',
      '30',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '21',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '160k',
      '-movflags',
      '+faststart',
      '-y',
      clipPath,
    ]);

    const info = await probe(clipPath);
    outputs.push({
      kind: 'VIDEO',
      label: clip.title,
      path: clipPath,
      mimeType: 'video/mp4',
      durationSec: info.durationSec,
      width: info.width,
      height: info.height,
    });
    outputs.push({
      kind: 'SUBTITLE',
      label: `${clip.title} 자막`,
      path: srtPath,
      mimeType: 'application/x-subrip',
    });

    await ctx.log('render', `${clip.title} — ${clip.reason}`);
  }

  return { title: `쇼츠 ${clips.length}편`, outputs };
}
