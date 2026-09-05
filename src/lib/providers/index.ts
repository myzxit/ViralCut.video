import { config } from '@/lib/config';
import {
  MockScriptWriter,
  MockSourceSeparator,
  MockSpeechToText,
  MockTextToSpeech,
} from './mock';
import {
  OpenAiScriptWriter,
  OpenAiSpeechToText,
  OpenAiTextToSpeech,
} from './openai';
import type { ProviderBundle, TextToSpeech } from './types';

/**
 * Resolve one provider per capability from whatever credentials exist.
 *
 * Each capability falls back independently: an OpenAI key alone gives real
 * transcription, scripting, and speech while separation stays on the filter-based
 * stand-in. Nothing here throws for a missing key.
 */
export function resolveProviders(): ProviderBundle {
  const useOpenAi = !config.providers.forceMock && Boolean(config.providers.openaiKey);

  const stt = useOpenAi ? new OpenAiSpeechToText() : new MockSpeechToText();
  const writer = useOpenAi ? new OpenAiScriptWriter() : new MockScriptWriter();
  const tts = useOpenAi ? new OpenAiTextToSpeech() : new MockTextToSpeech();

  // No hosted separation vendor is wired up yet; the filter split stands in until
  // a Demucs worker is available.
  const separator = new MockSourceSeparator();

  return {
    stt,
    writer,
    tts,
    separator,
    usingMocks: !useOpenAi,
  };
}

/** Voice list for the create form. Reads from whichever TTS provider is active. */
export function availableVoices(): TextToSpeech['voices'] {
  return resolveProviders().tts.voices;
}

export type { ProviderBundle } from './types';
