import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  dimensionsFor,
  escapeForFilter,
  extractAudio,
  probe,
  reframeFilter,
  runFfmpeg,
  subtitleMaskGraph,
  type AspectRatio,
} from '@/lib/media/ffmpeg';
import {
  cuesForLine,
  toAss,
  toSrt,
  type CaptionStyle,
  type Cue,
} from '@/lib/media/subtitles';
import {
  clampTargetMinutes,
  estimateScriptCharacters,
  estimateSceneCount,
  isSourceLongEnough,
  type SpeechRate,
} from '@/lib/reconstruct-plan';
import type { ProviderBundle } from '@/lib/providers/types';
import { outputDir, workDir } from '@/lib/storage';
import { buildSoundBed } from './sound-bed';
import type { PipelineContext, PipelineResult } from './types';

const RATE_TO_SPEED: Record<SpeechRate, number> = {
  slow: 0.9,
  normal: 1,
  fast: 1.15,
};

/**
 * Reconstruct pipeline.
 *
 * Keeps the source picture and replaces everything you can hear or read:
 *
 *   1. split the original audio into speech and everything else — both are dropped
 *   2. transcribe the speech (only to learn what the video is about)
 *   3. write a fresh script sized to the requested runtime
 *   4. speak that script in the chosen voice
 *   5. lay down new effects and music under the narration
 *   6. mask any burned-in subtitles, cut the footage to the script, burn new captions
 *
 * The original voice, original music/effects, and original subtitles appear nowhere
 * in the output.
 */
export async function runReconstruct(
  ctx: PipelineContext,
  providers: ProviderBundle,
): Promise<PipelineResult> {
  const { project, sourcePath, log } = ctx;
  const work = workDir(project.id);
  const out = outputDir(project.id);

  const targetMinutes = clampTargetMinutes(project.targetMinutes ?? 6);
  const speechRate = (project.speechRate ?? 'normal') as SpeechRate;
  const captionStyle = (project.captionStyle ?? 'clean') as CaptionStyle;
  const ratio = (project.aspectRatio ?? '9:16') as AspectRatio;
  const language = project.language ?? 'ko';

  const sourceInfo = await probe(sourcePath);
  if (!isSourceLongEnough(sourceInfo.durationSec, targetMinutes)) {
    throw new Error(
      `원본이 ${targetMinutes}분짜리 결과물을 만들기에 짧습니다. 더 짧은 길이를 선택해 주세요.`,
    );
  }

  // --- 1. Strip the original sound -----------------------------------------
  await ctx.setStage('separate', 10, '원본 목소리와 배경음을 분리합니다');
  const originalAudio = path.join(work, 'original.wav');
  await extractAudio(sourcePath, originalAudio);
  const stems = await providers.separator.separate({
    audioPath: originalAudio,
    outDir: work,
  });
  await log(
    'separate',
    sourceInfo.subtitleStreamCount > 0
      ? `자막 트랙 ${sourceInfo.subtitleStreamCount}개를 제거했습니다.`
      : '별도 자막 트랙은 없습니다. 화면에 박힌 자막은 가림 처리합니다.',
  );

  // --- 2. Understand the source --------------------------------------------
  await ctx.setStage('transcribe', 25, '원본 내용을 받아씁니다');
  const transcript = await providers.stt.transcribe({
    audioPath: stems.vocalsPath,
    language,
  });
  if (!transcript.segments.length) {
    throw new Error('원본에서 말소리를 찾지 못했습니다.');
  }

  // --- 3. Write a new script ------------------------------------------------
  await ctx.setStage('script', 40, '새 대본을 작성합니다');
  const sceneCount = estimateSceneCount(targetMinutes);
  const script = await providers.writer.writeReconstructScript({
    transcript,
    targetMinutes,
    targetCharacters: estimateScriptCharacters(targetMinutes, speechRate),
    sceneCount,
    language,
  });
  await log('script', `대사 ${script.lines.length}개, 약 ${script.lines.reduce((sum, line) => sum + line.text.length, 0)}자`);

  // A model writing the script can return windows that overlap, run backwards, or
  // point past the end of the footage. Anything out of range would render an empty
  // segment and silently shorten the result, so ranges are repaired before use.
  const { lines: plannedLines, repaired } = normalizeScriptRanges(
    script.lines,
    sourceInfo.durationSec,
  );
  if (repaired > 0) {
    await log(
      'script',
      `구간 ${repaired}개가 원본 범위를 벗어나 균등 분배로 보정했습니다.`,
      'warn',
    );
  }

  // --- 4. Speak it ----------------------------------------------------------
  await ctx.setStage('voice', 55, '새 목소리를 만듭니다');
  const narration = await providers.tts.synthesize({
    lines: script.lines.map((line) => line.text),
    voiceId: project.voiceId ?? providers.tts.voices[0].id,
    speechRate: RATE_TO_SPEED[speechRate],
    language,
    outDir: path.join(work, 'tts'),
  });

  // --- 5. New effects and music --------------------------------------------
  await ctx.setStage('sound', 68, '효과음과 배경음악을 얹습니다');
  const mixedAudio = await buildSoundBed({
    narrationPath: narration.audioPath,
    cues: script.lines.map((line, index) => ({
      atSec: narration.lineTimings[index]?.startSec ?? 0,
      kind: line.sfxCue,
    })),
    totalSec: narration.durationSec,
    outDir: work,
  });

  // --- 6. New subtitles -----------------------------------------------------
  await ctx.setStage('captions', 76, '새 자막을 붙입니다');
  const cues: Cue[] = narration.lineTimings.flatMap((timing) => cuesForLine(timing));
  const { width, height } = dimensionsFor(ratio);

  const srtPath = path.join(out, 'captions.srt');
  const assPath = path.join(work, 'captions.ass');
  await writeFile(srtPath, toSrt(cues), 'utf8');
  await writeFile(assPath, toAss(cues, { style: captionStyle, width, height }), 'utf8');

  const transcriptPath = path.join(out, 'script.txt');
  await writeFile(
    transcriptPath,
    [script.title, '', script.summary, '', ...script.lines.map((line) => line.text)].join('\n'),
    'utf8',
  );

  // --- 7. Cut the picture to the script ------------------------------------
  await ctx.setStage('render', 85, '영상을 이어붙입니다');
  const silentVideo = await renderPicture({
    sourcePath,
    sourceDurationSec: sourceInfo.durationSec,
    lines: plannedLines,
    timings: narration.lineTimings,
    ratio,
    maskBurnedIn: sourceInfo.subtitleStreamCount === 0,
    assPath,
    workDir: work,
  });

  const finalPath = path.join(out, 'reconstructed.mp4');
  await runFfmpeg([
    '-i',
    silentVideo,
    '-i',
    mixedAudio,
    '-map',
    '0:v:0',
    '-map',
    '1:a:0',
    '-c:v',
    'copy',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-shortest',
    '-movflags',
    '+faststart',
    '-y',
    finalPath,
  ]);

  const finalInfo = await probe(finalPath);

  return {
    title: script.title,
    outputs: [
      {
        kind: 'VIDEO',
        label: `재구성 영상 (${targetMinutes}분 목표)`,
        path: finalPath,
        mimeType: 'video/mp4',
        durationSec: finalInfo.durationSec,
        width: finalInfo.width,
        height: finalInfo.height,
      },
      {
        kind: 'SUBTITLE',
        label: '새 자막 (SRT)',
        path: srtPath,
        mimeType: 'application/x-subrip',
      },
      {
        kind: 'TRANSCRIPT',
        label: '새 대본 (TXT)',
        path: transcriptPath,
        mimeType: 'text/plain',
      },
    ],
  };
}

type SourceWindow = { sourceStartSec: number; sourceEndSec: number };

/** Shortest usable piece of footage; below this a cut reads as a flicker. */
const MIN_WINDOW_SEC = 1.5;

/**
 * Clamp every script window into the footage that actually exists.
 *
 * Windows that are backwards, degenerate, or out of range are replaced with an even
 * slice of the source at that line's position — the narration still has something to
 * play over, and the result keeps the requested runtime.
 */
export function normalizeScriptRanges(
  lines: SourceWindow[],
  sourceDurationSec: number,
): { lines: SourceWindow[]; repaired: number } {
  const usable = Math.max(MIN_WINDOW_SEC, sourceDurationSec);
  const evenWindow = usable / Math.max(1, lines.length);
  let repaired = 0;

  const normalized = lines.map((line, index) => {
    const start = Number(line.sourceStartSec);
    const end = Number(line.sourceEndSec);

    const valid =
      Number.isFinite(start) &&
      Number.isFinite(end) &&
      start >= 0 &&
      end <= usable &&
      end - start >= MIN_WINDOW_SEC;

    if (valid) return { sourceStartSec: start, sourceEndSec: end };

    repaired += 1;
    const fallbackStart = Math.min(index * evenWindow, Math.max(0, usable - MIN_WINDOW_SEC));
    return {
      sourceStartSec: fallbackStart,
      sourceEndSec: Math.min(usable, fallbackStart + Math.max(MIN_WINDOW_SEC, evenWindow)),
    };
  });

  return { lines: normalized, repaired };
}

/**
 * Build the picture track: one segment of source footage per narration line, each
 * stretched or trimmed to match how long that line takes to say.
 */
async function renderPicture({
  sourcePath,
  sourceDurationSec,
  lines,
  timings,
  ratio,
  maskBurnedIn,
  assPath,
  workDir: work,
}: {
  sourcePath: string;
  sourceDurationSec: number;
  lines: SourceWindow[];
  timings: { startSec: number; endSec: number }[];
  ratio: AspectRatio;
  maskBurnedIn: boolean;
  assPath: string;
  workDir: string;
}) {
  const segmentPaths: string[] = [];

  for (const [index, line] of lines.entries()) {
    const timing = timings[index];
    if (!timing) continue;

    const needed = Math.max(0.5, timing.endSec - timing.startSec);
    const available = Math.max(0.5, line.sourceEndSec - line.sourceStartSec);
    // Hold the shot longer or shorter to cover the narration, but keep the change
    // subtle — beyond 2x either way it reads as a glitch rather than an edit.
    let speed = Math.min(2, Math.max(0.5, available / needed));

    // Reading `needed * speed` seconds from `sourceStartSec` has to stay inside the
    // file. Past the end ffmpeg writes a zero-length segment, which would quietly
    // shorten the finished video — so pull the start back to make room, and only
    // then give up some speed if the source is still too short.
    let readDuration = needed * speed;
    let startSec = line.sourceStartSec;
    if (startSec + readDuration > sourceDurationSec) {
      startSec = Math.max(0, sourceDurationSec - readDuration);
      readDuration = Math.min(readDuration, sourceDurationSec - startSec);
      speed = Math.max(0.5, readDuration / needed);
    }
    if (readDuration < 0.2) continue;

    const segmentPath = path.join(work, `seg-${String(index).padStart(4, '0')}.mp4`);
    const filters = [`setpts=${(1 / speed).toFixed(4)}*PTS`, reframeFilter(ratio)];

    await runFfmpeg([
      '-ss',
      startSec.toFixed(3),
      '-t',
      readDuration.toFixed(3),
      '-i',
      sourcePath,
      '-an',
      '-vf',
      filters.join(','),
      '-r',
      '30',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '20',
      '-pix_fmt',
      'yuv420p',
      '-y',
      segmentPath,
    ]);

    // ffmpeg exits 0 even when a seek lands somewhere unreadable and nothing is
    // written. Concatenating such a file drops the segment without any error, so
    // each one is checked before it joins the list.
    const rendered = await probe(segmentPath).catch(() => null);
    if (!rendered || rendered.durationSec <= 0) continue;

    segmentPaths.push(segmentPath);
  }

  if (!segmentPaths.length) {
    throw new Error('영상 구간을 만들지 못했습니다.');
  }

  const listPath = path.join(work, 'segments.txt');
  await writeFile(listPath, segmentPaths.map((p) => `file '${p}'`).join('\n'));

  const joinedPath = path.join(work, 'joined.mp4');
  await runFfmpeg([
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    listPath,
    '-c',
    'copy',
    '-y',
    joinedPath,
  ]);

  // Mask first, then burn captions on top, so the new text never gets blurred.
  const finalFilter = maskBurnedIn
    ? `${subtitleMaskGraph('0:v', 'masked')};[masked]subtitles='${escapeForFilter(assPath)}'[v]`
    : `[0:v]subtitles='${escapeForFilter(assPath)}'[v]`;

  const captionedPath = path.join(work, 'captioned.mp4');
  await runFfmpeg([
    '-i',
    joinedPath,
    '-filter_complex',
    finalFilter,
    '-map',
    '[v]',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '20',
    '-pix_fmt',
    'yuv420p',
    '-y',
    captionedPath,
  ]);

  return captionedPath;
}
