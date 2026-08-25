/**
 * Subtitle authoring.
 *
 * The pipeline needs two forms: SRT as a downloadable sidecar, and ASS for burning
 * in, because ASS is the only format ffmpeg can style (font, outline, position)
 * without a separate compositing pass.
 */

export type Cue = { startSec: number; endSec: number; text: string };

export type CaptionStyle = 'clean' | 'bold' | 'outline' | 'boxed';

const STYLE_PRESETS: Record<
  CaptionStyle,
  { fontSize: number; primary: string; outline: string; borderStyle: number; shadow: number }
> = {
  // ASS colours are &HAABBGGRR — alpha first, then blue/green/red.
  clean: { fontSize: 54, primary: '&H00FFFFFF', outline: '&HC0000000', borderStyle: 1, shadow: 0 },
  bold: { fontSize: 64, primary: '&H0000E5FF', outline: '&HFF000000', borderStyle: 1, shadow: 2 },
  outline: { fontSize: 58, primary: '&H00FFFFFF', outline: '&H00000000', borderStyle: 1, shadow: 0 },
  boxed: { fontSize: 52, primary: '&H00FFFFFF', outline: '&HB4201214', borderStyle: 3, shadow: 0 },
};

/**
 * Korean reads comfortably at about 16 characters per line, two lines at a time.
 * Longer cues get split on spaces where possible, on character count otherwise
 * (Korean sentences often run without spaces at clause boundaries).
 */
export function wrapCaptionText(text: string, maxPerLine = 16, maxLines = 2) {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (!current) {
      current = word;
    } else if (current.length + 1 + word.length <= maxPerLine) {
      current += ` ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);

  // A single unbroken run longer than the limit still has to be cut somewhere.
  const hardWrapped = lines.flatMap((line) =>
    line.length <= maxPerLine
      ? [line]
      : (line.match(new RegExp(`.{1,${maxPerLine}}`, 'g')) ?? [line]),
  );

  return hardWrapped.slice(0, maxLines).join('\n');
}

/**
 * Break text into chunks of at most `maxChars`, preferring a clause boundary and
 * then a space. Splitting mid-word is the last resort — it looks like a bug on
 * screen, but a run of text with neither punctuation nor spaces leaves no choice.
 */
function chunkText(text: string, maxChars: number): string[] {
  const chunks: string[] = [];
  let rest = text.trim();

  while (rest.length > maxChars) {
    const window = rest.slice(0, maxChars + 1);

    const clause = Math.max(
      window.lastIndexOf('. '),
      window.lastIndexOf(', '),
      window.lastIndexOf('? '),
      window.lastIndexOf('! '),
      window.lastIndexOf('다 '),
      window.lastIndexOf('요 '),
    );
    const space = window.lastIndexOf(' ');

    // Only honour a boundary that is not so early it leaves a stub cue.
    const minimum = Math.floor(maxChars * 0.4);
    const cut =
      clause >= minimum ? clause + 1 : space >= minimum ? space : maxChars;

    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }

  if (rest) chunks.push(rest);
  return chunks;
}

/**
 * Split one narration line into cues that appear in step with the speech.
 * TTS gives us a line's start and end; time is shared out by chunk length so a
 * longer chunk stays on screen longer.
 */
export function cuesForLine(
  line: { startSec: number; endSec: number; text: string },
  maxCharsPerCue = 32,
): Cue[] {
  const text = line.text.trim();
  if (text.length <= maxCharsPerCue) return [{ ...line, text }];

  const chunks = chunkText(text, maxCharsPerCue);
  const totalChars = chunks.reduce((sum, chunk) => sum + chunk.length, 0) || 1;
  const span = line.endSec - line.startSec;

  let cursor = line.startSec;
  return chunks.map((chunk) => {
    const duration = (chunk.length / totalChars) * span;
    const cue = { startSec: cursor, endSec: cursor + duration, text: chunk };
    cursor += duration;
    return cue;
  });
}

function srtTimestamp(seconds: number) {
  const clamped = Math.max(0, seconds);
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const secs = Math.floor(clamped % 60);
  const millis = Math.round((clamped - Math.floor(clamped)) * 1000);
  const pad = (n: number, width = 2) => String(n).padStart(width, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)},${pad(millis, 3)}`;
}

function assTimestamp(seconds: number) {
  const clamped = Math.max(0, seconds);
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const secs = Math.floor(clamped % 60);
  const centis = Math.round((clamped - Math.floor(clamped)) * 100);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${hours}:${pad(minutes)}:${pad(secs)}.${pad(Math.min(99, centis))}`;
}

export function toSrt(cues: Cue[]) {
  return (
    cues
      .map((cue, index) =>
        [
          index + 1,
          `${srtTimestamp(cue.startSec)} --> ${srtTimestamp(cue.endSec)}`,
          wrapCaptionText(cue.text),
          '',
        ].join('\n'),
      )
      .join('\n') + '\n'
  );
}

export function toAss(
  cues: Cue[],
  options: {
    style?: CaptionStyle;
    width: number;
    height: number;
    fontName?: string;
  },
) {
  const preset = STYLE_PRESETS[options.style ?? 'clean'];
  const fontName = options.fontName ?? 'NanumGothic';
  // Scale the preset (authored against a 1080-wide frame) to the real output.
  const fontSize = Math.round((preset.fontSize * options.width) / 1080);
  const marginV = Math.round(options.height * 0.12);

  const header = [
    '[Script Info]',
    'ScriptType: v4.00+',
    `PlayResX: ${options.width}`,
    `PlayResY: ${options.height}`,
    'WrapStyle: 2',
    'ScaledBorderAndShadow: yes',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, Italic, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    `Style: Main,${fontName},${fontSize},${preset.primary},${preset.outline},&H00000000,1,0,${preset.borderStyle},4,${preset.shadow},2,60,60,${marginV},1`,
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ].join('\n');

  const events = cues.map((cue) => {
    const text = wrapCaptionText(cue.text).replace(/\n/g, '\\N');
    return `Dialogue: 0,${assTimestamp(cue.startSec)},${assTimestamp(cue.endSec)},Main,,0,0,0,,${text}`;
  });

  return `${header}\n${events.join('\n')}\n`;
}
