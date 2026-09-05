import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { config } from '@/lib/config';
import { prepareTranscriptionChunks } from '@/lib/media/audio';
import { probe } from '@/lib/media/ffmpeg';
import type {
  HighlightClip,
  ReconstructScript,
  ScriptWriter,
  SpeechToText,
  SynthesizedSpeech,
  TextToSpeech,
  Transcript,
  TranscriptSegment,
} from './types';

/**
 * OpenAI-backed implementations. Kept in one file because they share auth and error
 * handling; swapping any single capability for another vendor means writing a new
 * class against the interface in `types.ts`, not editing this one.
 */

function authHeaders() {
  return {
    Authorization: `Bearer ${config.providers.openaiKey}`,
  };
}

async function postJson<T>(endpoint: string, body: unknown): Promise<T> {
  const response = await fetch(`${config.providers.openaiBaseUrl}${endpoint}`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(
      `OpenAI ${endpoint} ${response.status}: ${(await response.text()).slice(0, 400)}`,
    );
  }
  return (await response.json()) as T;
}

export class OpenAiSpeechToText implements SpeechToText {
  readonly id = 'openai-whisper';

  async transcribe({
    audioPath,
    language = 'ko',
  }: {
    audioPath: string;
    language?: string;
  }): Promise<Transcript> {
    const info = await probe(audioPath);

    // The pipeline's 48 kHz stereo PCM is ~11.5 MB per minute, so sending it as-is
    // would exceed the 25 MB upload cap after roughly two minutes. Downmix first,
    // and split when even the compact form is too big for one request.
    const chunks = await prepareTranscriptionChunks(
      audioPath,
      path.join(path.dirname(audioPath), 'stt'),
    );

    const segments: TranscriptSegment[] = [];
    for (const chunk of chunks) {
      const parsed = await this.transcribeOne(chunk.filePath, language);
      for (const segment of parsed) {
        // Each chunk's timestamps restart at zero; shift them onto one timeline.
        segments.push({
          startSec: segment.start + chunk.offsetSec,
          endSec: segment.end + chunk.offsetSec,
          text: segment.text.trim(),
        });
      }
    }

    return {
      language,
      durationSec: info.durationSec,
      segments: segments.filter((segment) => segment.text.length > 0),
    };
  }

  private async transcribeOne(filePath: string, language: string) {
    const form = new FormData();
    // Chunks are a few MB at most, so reading one into memory is bounded.
    form.append('file', new Blob([await readFile(filePath)]), path.basename(filePath));
    form.append('model', 'whisper-1');
    form.append('language', language);
    form.append('response_format', 'verbose_json');
    form.append('timestamp_granularities[]', 'segment');

    const response = await fetch(
      `${config.providers.openaiBaseUrl}/audio/transcriptions`,
      { method: 'POST', headers: authHeaders(), body: form },
    );
    if (!response.ok) {
      throw new Error(
        `OpenAI transcription ${response.status}: ${(await response.text()).slice(0, 400)}`,
      );
    }

    const parsed = (await response.json()) as {
      segments?: { start: number; end: number; text: string }[];
    };
    return parsed.segments ?? [];
  }
}

/** Condense a transcript so a long source still fits in one prompt. */
function transcriptDigest(transcript: Transcript, maxChars = 24_000) {
  const lines = transcript.segments.map(
    (segment) => `[${Math.round(segment.startSec)}s] ${segment.text}`,
  );
  const joined = lines.join('\n');
  if (joined.length <= maxChars) return joined;

  // Keep an even spread across the whole runtime rather than truncating the tail —
  // the ending is usually where the conclusion is.
  const keepEvery = Math.ceil(joined.length / maxChars);
  return lines.filter((_, index) => index % keepEvery === 0).join('\n');
}

export class OpenAiScriptWriter implements ScriptWriter {
  readonly id = 'openai-writer';

  async writeReconstructScript({
    transcript,
    targetMinutes,
    targetCharacters,
    sceneCount,
    language,
    tone,
  }: {
    transcript: Transcript;
    targetMinutes: number;
    targetCharacters: number;
    sceneCount: number;
    language: string;
    tone?: string;
  }): Promise<ReconstructScript> {
    const result = await postJson<{
      choices: { message: { content: string } }[];
    }>('/chat/completions', {
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            '너는 영상 재구성 대본 작가다. 원본 영상의 받아쓰기를 읽고, 같은 사실관계를 유지하되 문장과 구성은 완전히 새로 쓴 내레이션 대본을 만든다. ' +
            '원본 문장을 그대로 옮기지 마라. 각 대사는 그 내용을 설명하는 원본 구간(초 단위)에 연결해야 한다. ' +
            'JSON만 출력한다.',
        },
        {
          role: 'user',
          content: [
            `언어: ${language}`,
            `목표 길이: ${targetMinutes}분`,
            `전체 분량: 약 ${targetCharacters}자`,
            `대사 수: 정확히 ${sceneCount}개`,
            `원본 길이: ${Math.round(transcript.durationSec)}초`,
            tone ? `톤: ${tone}` : '',
            '',
            '출력 형식:',
            '{"title":"제목","summary":"한 줄 요약","lines":[{"text":"대사","sourceStartSec":0,"sourceEndSec":12,"sfxCue":"transition|emphasis|null"}]}',
            '',
            '원본 받아쓰기:',
            transcriptDigest(transcript),
          ]
            .filter(Boolean)
            .join('\n'),
        },
      ],
    });

    const parsed = JSON.parse(result.choices[0].message.content) as ReconstructScript;
    if (!parsed.lines?.length) {
      throw new Error('대본 생성 결과가 비어 있습니다.');
    }
    return parsed;
  }

  async selectHighlights({
    transcript,
    maxClipSeconds,
    language,
  }: {
    transcript: Transcript;
    maxClipSeconds: number;
    language: string;
  }): Promise<HighlightClip[]> {
    const result = await postJson<{
      choices: { message: { content: string } }[];
    }>('/chat/completions', {
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            '너는 숏폼 편집자다. 받아쓰기를 읽고 단독으로 봐도 이해되는 하이라이트 구간을 고른다. ' +
            '각 구간은 문장 중간에서 시작하거나 끝나면 안 된다. JSON만 출력한다.',
        },
        {
          role: 'user',
          content: [
            `언어: ${language}`,
            `구간당 최대 길이: ${maxClipSeconds}초`,
            '쓸 만한 구간이 없으면 빈 배열을 반환해라. 억지로 채우지 마라.',
            '',
            '출력 형식:',
            '{"clips":[{"title":"제목","startSec":0,"endSec":45,"reason":"고른 이유","hookText":"첫 화면 문구"}]}',
            '',
            '원본 받아쓰기:',
            transcriptDigest(transcript),
          ].join('\n'),
        },
      ],
    });

    const parsed = JSON.parse(result.choices[0].message.content) as {
      clips?: HighlightClip[];
    };
    return (parsed.clips ?? []).filter(
      (clip) => clip.endSec > clip.startSec && clip.endSec <= transcript.durationSec,
    );
  }
}

export class OpenAiTextToSpeech implements TextToSpeech {
  readonly id = 'openai-tts';

  readonly voices = [
    { id: 'alloy', label: '차분한 중성', description: '설명형 내레이션' },
    { id: 'echo', label: '차분한 남성', description: '다큐멘터리 톤' },
    { id: 'nova', label: '경쾌한 여성', description: '리뷰·브이로그' },
    { id: 'shimmer', label: '부드러운 여성', description: '감성 브이로그' },
  ];

  async synthesize({
    lines,
    voiceId,
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

    // Synthesize per line so each one keeps its own measurable duration — that is
    // what the subtitle timings are built from.
    const linePaths: string[] = [];
    for (const [index, text] of lines.entries()) {
      const response = await fetch(`${config.providers.openaiBaseUrl}/audio/speech`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini-tts',
          voice: voiceId,
          input: text,
          speed: Math.min(4, Math.max(0.25, speechRate)),
          response_format: 'wav',
        }),
      });
      if (!response.ok) {
        throw new Error(
          `OpenAI speech ${response.status}: ${(await response.text()).slice(0, 300)}`,
        );
      }
      const filePath = path.join(outDir, `line-${String(index).padStart(4, '0')}.wav`);
      await writeFile(filePath, Buffer.from(await response.arrayBuffer()));
      linePaths.push(filePath);
    }

    const { concatNarration } = await import('@/lib/media/narration');
    return concatNarration(linePaths, lines, outDir);
  }
}
