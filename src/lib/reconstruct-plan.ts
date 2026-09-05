/**
 * Shared maths for the reconstruct feature.
 *
 * The landing preview, the create form, and the worker all need the same answer to
 * "if the user asks for N minutes, how much script and how many scenes is that?" —
 * so it lives in one place rather than being re-derived per surface.
 */

export const MIN_TARGET_MINUTES = 1;
export const MAX_TARGET_MINUTES = 28;
export const DEFAULT_TARGET_MINUTES = 6;

/**
 * Korean narration at a comfortable listening pace runs roughly 330 characters per
 * minute. Slower/faster voice settings scale this.
 */
const CHARACTERS_PER_MINUTE = 330;

/** Scenes get longer as the target length grows — a 28-minute video is not 28x the cuts. */
const SECONDS_PER_SCENE = (minutes: number) => (minutes <= 3 ? 6 : minutes <= 10 ? 9 : 13);

export type SpeechRate = 'slow' | 'normal' | 'fast';

const RATE_FACTOR: Record<SpeechRate, number> = {
  slow: 0.85,
  normal: 1,
  fast: 1.18,
};

export function clampTargetMinutes(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_TARGET_MINUTES;
  return Math.min(
    MAX_TARGET_MINUTES,
    Math.max(MIN_TARGET_MINUTES, Math.round(value)),
  );
}

export function estimateScriptCharacters(
  minutes: number,
  rate: SpeechRate = 'normal',
): number {
  const target = clampTargetMinutes(minutes);
  return Math.round(target * CHARACTERS_PER_MINUTE * RATE_FACTOR[rate]);
}

export function estimateSceneCount(minutes: number): number {
  const target = clampTargetMinutes(minutes);
  return Math.max(3, Math.round((target * 60) / SECONDS_PER_SCENE(target)));
}

/**
 * A source has to be long enough to fill the requested runtime without looping.
 * We allow modest stretching (holding shots slightly longer) but not fabrication.
 */
export function isSourceLongEnough(
  sourceSeconds: number,
  targetMinutes: number,
): boolean {
  const target = clampTargetMinutes(targetMinutes);
  return sourceSeconds >= target * 60 * 0.6;
}

export function maxTargetMinutesForSource(sourceSeconds: number): number {
  return clampTargetMinutes(Math.floor(sourceSeconds / 60 / 0.6));
}
