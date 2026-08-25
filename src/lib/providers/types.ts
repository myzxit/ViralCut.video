/**
 * Provider contracts for the AI steps of the pipeline.
 *
 * Each capability is a narrow interface with at least two implementations: a real
 * one that calls a vendor, and a mock that produces plausible output offline. The
 * pipeline only ever sees these interfaces, so swapping vendors — or running the
 * whole thing with no API keys at all — never touches pipeline code.
 */

export type TranscriptSegment = {
  startSec: number;
  endSec: number;
  text: string;
  /** Stable id for whoever is speaking, when the provider can tell them apart. */
  speaker?: string;
};

export type Transcript = {
  language: string;
  durationSec: number;
  segments: TranscriptSegment[];
};

export interface SpeechToText {
  readonly id: string;
  transcribe(input: {
    audioPath: string;
    language?: string;
  }): Promise<Transcript>;
}

/** One line of the rewritten narration, tied to the source footage it plays over. */
export type ScriptLine = {
  text: string;
  /** Where in the SOURCE video the footage for this line comes from. */
  sourceStartSec: number;
  sourceEndSec: number;
  /** Optional cue for the sound designer step, e.g. "transition" or "emphasis". */
  sfxCue?: string;
};

export type ReconstructScript = {
  title: string;
  summary: string;
  lines: ScriptLine[];
};

/** A highlight window the shorts pipeline should cut out of the source. */
export type HighlightClip = {
  title: string;
  startSec: number;
  endSec: number;
  /** Why this window was picked — surfaced in the UI so the choice is legible. */
  reason: string;
  hookText: string;
};

export interface ScriptWriter {
  readonly id: string;

  /** Rewrite the source into narration that fills `targetMinutes`. */
  writeReconstructScript(input: {
    transcript: Transcript;
    targetMinutes: number;
    targetCharacters: number;
    sceneCount: number;
    language: string;
    tone?: string;
  }): Promise<ReconstructScript>;

  /** Pick highlight windows for the shorts pipeline. */
  selectHighlights(input: {
    transcript: Transcript;
    maxClipSeconds: number;
    language: string;
  }): Promise<HighlightClip[]>;
}

export type SynthesizedSpeech = {
  audioPath: string;
  durationSec: number;
  /** Per-line timings, needed to place subtitles against the new narration. */
  lineTimings: { startSec: number; endSec: number; text: string }[];
};

export interface TextToSpeech {
  readonly id: string;
  readonly voices: { id: string; label: string; description: string }[];

  synthesize(input: {
    lines: string[];
    voiceId: string;
    speechRate: number;
    language: string;
    outDir: string;
  }): Promise<SynthesizedSpeech>;
}

export type SeparatedStems = {
  /** Isolated speech. The reconstruct pipeline transcribes this, then discards it. */
  vocalsPath: string;
  /** Everything that is not speech: music, room tone, effects. Also discarded. */
  accompanimentPath: string;
};

export interface SourceSeparator {
  readonly id: string;
  separate(input: { audioPath: string; outDir: string }): Promise<SeparatedStems>;
}

export type ProviderBundle = {
  stt: SpeechToText;
  writer: ScriptWriter;
  tts: TextToSpeech;
  separator: SourceSeparator;
  /** True when any capability fell back to a mock, so the UI can say so. */
  usingMocks: boolean;
};
