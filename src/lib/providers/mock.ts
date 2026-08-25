import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { probe, runFfmpeg } from '@/lib/media/ffmpeg';
import type {
  HighlightClip,
  ReconstructScript,
  ScriptWriter,
  SeparatedStems,
  SourceSeparator,
  SpeechToText,
  SynthesizedSpeech,
  TextToSpeech,
  Transcript,
} from './types';

/**
 * Offline stand-ins for every AI capability.
 *
 * These are not stubs that throw — they produce real files with real durations, so
 * the full pipeline (ffmpeg included) runs end to end with no API keys. That makes
 * the render path testable on its own, separately from vendor behaviour.
 */

const KOREAN_FILLER = [
  '이 부분에서 핵심 내용이 정리됩니다',
  '앞에서 다룬 내용을 조금 더 풀어서 설명합니다',
  '여기서 중요한 차이가 드러납니다',
  '실제로 어떻게 적용되는지 살펴봅니다',
  '결과를 정리하면 다음과 같습니다',
  '마지막으로 짚고 넘어갈 부분입니다',
];

export class MockSpeechToText implements SpeechToText {
  readonly id = 'mock-stt';

  async transcribe({
    audioPath,
    language = 'ko',
  }: {
    audioPath: string;
    language?: string;
  }): Promise<Transcript> {
    // Match the real audio's length. A fixed duration here would hand downstream
    // stages timestamps that point past the end of the source.
    const durationSec = Math.max(8, (await probe(audioPath)).durationSec);
    const segmentLength = 8;
    const segments = Array.from(
      { length: Math.floor(durationSec / segmentLength) },
      (_, index) => ({
        startSec: index * segmentLength,
        endSec: (index + 1) * segmentLength,
        text: KOREAN_FILLER[index % KOREAN_FILLER.length],
        speaker: index % 3 === 0 ? 'speaker_1' : 'speaker_0',
      }),
    );
    return { language, durationSec, segments };
  }
}

export class MockScriptWriter implements ScriptWriter {
  readonly id = 'mock-writer';

  async writeReconstructScript({
    transcript,
    targetCharacters,
    sceneCount,
  }: {
    transcript: Transcript;
    targetMinutes: number;
    targetCharacters: number;
    sceneCount: number;
    language: string;
  }): Promise<ReconstructScript> {
    const perLine = Math.max(20, Math.round(targetCharacters / sceneCount));
    const window = transcript.durationSec / sceneCount;

    const lines = Array.from({ length: sceneCount }, (_, index) => {
      const base = KOREAN_FILLER[index % KOREAN_FILLER.length];
      // Pad to roughly the character budget so TTS duration lands near the target.
      const text = base.repeat(Math.max(1, Math.ceil(perLine / base.length))).slice(
        0,
        perLine,
      );
      return {
        text,
        sourceStartSec: Math.round(index * window),
        sourceEndSec: Math.round((index + 1) * window),
        sfxCue: index === 0 ? 'transition' : index % 4 === 0 ? 'emphasis' : undefined,
      };
    });

    return {
      title: '재구성된 영상',
      summary: '원본 내용을 바탕으로 새로 작성한 대본입니다.',
      lines,
    };
  }

  async selectHighlights({
    transcript,
    maxClipSeconds,
  }: {
    transcript: Transcript;
    maxClipSeconds: number;
    language: string;
  }): Promise<HighlightClip[]> {
    const count = Math.min(6, Math.max(1, Math.floor(transcript.durationSec / 120)));
    const stride = transcript.durationSec / (count + 1);

    return Array.from({ length: count }, (_, index) => {
      const startSec = Math.round(stride * (index + 1) - maxClipSeconds / 2);
      return {
        title: `하이라이트 ${index + 1}`,
        startSec: Math.max(0, startSec),
        endSec: Math.min(
          transcript.durationSec,
          Math.max(0, startSec) + maxClipSeconds,
        ),
        reason: '말의 밀도와 화면 변화가 함께 높아지는 구간입니다.',
        hookText: KOREAN_FILLER[index % KOREAN_FILLER.length],
      };
    });
  }
}

export class MockTextToSpeech implements TextToSpeech {
  readonly id = 'mock-tts';

  readonly voices = [
    { id: 'narrator-w', label: '차분한 여성', description: '설명형 내레이션' },
    { id: 'narrator-m', label: '차분한 남성', description: '다큐멘터리 톤' },
    { id: 'energetic-w', label: '경쾌한 여성', description: '리뷰·브이로그' },
    { id: 'energetic-m', label: '경쾌한 남성', description: '게임·예능' },
  ];

  async synthesize({
    lines,
    speechRate,
    outDir,
  }: {
    lines: string[];
    voiceId: string;
    speechRate: number;
    language: string;
    outDir: string;
  }): Promise<SynthesizedSpeech> {
    await mkdir(outDir, { recursive: true });
    const audioPath = path.join(outDir, 'narration.wav');

    // Korean narration runs ~5.5 characters per second at a normal pace.
    const charsPerSecond = 5.5 * speechRate;
    let cursor = 0;
    const lineTimings = lines.map((text) => {
      const duration = Math.max(1.2, text.length / charsPerSecond);
      const timing = { startSec: cursor, endSec: cursor + duration, text };
      cursor += duration + 0.35; // small breath between lines
      return timing;
    });

    // Render actual silence of the right length so the mux step behaves identically
    // to a real narration track.
    await runFfmpeg([
      '-f',
      'lavfi',
      '-i',
      `anullsrc=channel_layout=stereo:sample_rate=48000`,
      '-t',
      cursor.toFixed(3),
      '-c:a',
      'pcm_s16le',
      '-y',
      audioPath,
    ]);

    return { audioPath, durationSec: cursor, lineTimings };
  }
}

export class MockSourceSeparator implements SourceSeparator {
  readonly id = 'mock-separator';

  async separate({
    audioPath,
    outDir,
  }: {
    audioPath: string;
    outDir: string;
  }): Promise<SeparatedStems> {
    await mkdir(outDir, { recursive: true });
    const vocalsPath = path.join(outDir, 'vocals.wav');
    const accompanimentPath = path.join(outDir, 'accompaniment.wav');

    // Without a separation model we approximate the split with filters: a band-pass
    // around the speech range for "vocals", and its inverse for everything else.
    // Both stems are discarded by the reconstruct pipeline anyway — only the vocals
    // are read, and only to transcribe them.
    await runFfmpeg([
      '-i',
      audioPath,
      '-af',
      'highpass=f=180,lowpass=f=3600',
      '-c:a',
      'pcm_s16le',
      '-y',
      vocalsPath,
    ]);
    await runFfmpeg([
      '-i',
      audioPath,
      '-af',
      'highpass=f=3600',
      '-c:a',
      'pcm_s16le',
      '-y',
      accompanimentPath,
    ]);

    return { vocalsPath, accompanimentPath };
  }
}
