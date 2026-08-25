'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { AudioLines, Film, Link2, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  DEFAULT_TARGET_MINUTES,
  MAX_TARGET_MINUTES,
  MIN_TARGET_MINUTES,
  estimateScriptCharacters,
  estimateSceneCount,
} from '@/lib/reconstruct-plan';
import { cn } from '@/lib/utils';
import { isLikelyVideoUrl } from '@/lib/video-url';

type Mode = 'SHORTS' | 'RECONSTRUCT';

const captionStyles = [
  { id: 'clean', label: '기본', hint: '흰 글씨 + 그림자' },
  { id: 'bold', label: '강조', hint: '노란 글씨 + 굵은 외곽선' },
  { id: 'outline', label: '외곽선', hint: '검은 테두리만' },
  { id: 'boxed', label: '박스', hint: '반투명 배경 위 글씨' },
] as const;

const ratios = [
  { id: '9:16', label: '세로 9:16', hint: '쇼츠 · 릴스 · 틱톡' },
  { id: '1:1', label: '정사각 1:1', hint: '피드 게시물' },
  { id: '16:9', label: '가로 16:9', hint: '일반 유튜브' },
] as const;

const speechRates = [
  { id: 'slow', label: '느리게' },
  { id: 'normal', label: '보통' },
  { id: 'fast', label: '빠르게' },
] as const;

export function CreateProjectForm({
  voices,
  usingMocks,
}: {
  voices: { id: string; label: string; description: string }[];
  usingMocks: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const [mode, setMode] = useState<Mode>(
    params.get('mode') === 'reconstruct' ? 'RECONSTRUCT' : 'SHORTS',
  );
  const [url, setUrl] = useState(params.get('url') ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [targetMinutes, setTargetMinutes] = useState(DEFAULT_TARGET_MINUTES);
  const [voiceId, setVoiceId] = useState(voices[0]?.id ?? '');
  const [speechRate, setSpeechRate] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [captionStyle, setCaptionStyle] = useState<string>('clean');
  const [aspectRatio, setAspectRatio] = useState<string>('9:16');

  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const trimmedUrl = url.trim();
    if (!trimmedUrl && !file) {
      setError('영상 주소를 넣거나 파일을 선택해 주세요.');
      return;
    }
    if (trimmedUrl && file) {
      setError('주소와 파일 중 하나만 선택해 주세요.');
      return;
    }
    if (trimmedUrl && !isLikelyVideoUrl(trimmedUrl)) {
      setError('지원하지 않는 영상 주소입니다.');
      return;
    }

    setBusy(true);
    try {
      let uploadPath: string | undefined;

      if (file) {
        setBusyLabel('영상을 올리는 중...');
        const form = new FormData();
        form.append('file', file);
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: form,
        });
        const uploadJson = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(uploadJson.error ?? '업로드 실패');
        uploadPath = uploadJson.uploadPath;
      }

      setBusyLabel('작업을 등록하는 중...');
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          sourceUrl: trimmedUrl || undefined,
          uploadPath,
          aspectRatio,
          captionStyle,
          ...(mode === 'RECONSTRUCT'
            ? { targetMinutes, voiceId, speechRate }
            : {}),
        }),
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? '작업 등록에 실패했습니다.');

      router.push(`/app/projects/${json.project.id}`);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : '알 수 없는 오류가 발생했습니다.',
      );
      setBusy(false);
      setBusyLabel('');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {usingMocks && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          지금은 <strong>목 모드</strong>로 동작합니다. 편집·렌더링은 실제로
          이뤄지지만, 대본과 목소리는 예시 데이터입니다. 서버에 API 키를 넣으면
          실제 결과물이 나옵니다.
        </p>
      )}

      {/* Mode */}
      <fieldset className="surface-card p-6">
        <legend className="sr-only">제작 방식</legend>
        <h2 className="text-base font-bold">무엇을 만들까요?</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ModeCard
            active={mode === 'SHORTS'}
            onClick={() => setMode('SHORTS')}
            icon={<Film className="h-5 w-5" />}
            title="쇼츠 추출"
            detail="하이라이트 구간을 찾아 세로 쇼츠로 잘라냅니다. 원본 음성은 그대로 씁니다."
          />
          <ModeCard
            active={mode === 'RECONSTRUCT'}
            onClick={() => setMode('RECONSTRUCT')}
            icon={<AudioLines className="h-5 w-5" />}
            title="영상 재구성"
            detail="원본 목소리·효과음·자막을 걷어내고 새 목소리와 자막으로 다시 만듭니다."
          />
        </div>
      </fieldset>

      {/* Source */}
      <fieldset className="surface-card p-6">
        <legend className="sr-only">원본 영상</legend>
        <h2 className="text-base font-bold">원본 영상</h2>

        <label htmlFor="source-url" className="mt-4 block text-sm font-medium text-ink-soft">
          영상 주소
        </label>
        <div className="mt-2 flex items-center gap-2.5 rounded-2xl border border-black/10 px-4 focus-within:border-brand-400">
          <Link2 className="h-4 w-4 shrink-0 text-ink-faint" />
          <input
            id="source-url"
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            disabled={Boolean(file)}
            placeholder="https://youtube.com/watch?v=..."
            className="h-12 w-full bg-transparent text-[0.95rem] outline-none placeholder:text-ink-faint disabled:opacity-40"
          />
        </div>

        <div className="my-4 flex items-center gap-3 text-xs text-ink-faint">
          <span className="h-px flex-1 bg-black/[0.07]" />
          또는
          <span className="h-px flex-1 bg-black/[0.07]" />
        </div>

        <label
          htmlFor="source-file"
          className={cn(
            'flex cursor-pointer items-center justify-center gap-2.5 rounded-2xl border border-dashed border-black/15 px-4 py-6 text-sm transition hover:border-brand-300 hover:bg-brand-50/40',
            url.trim() && 'pointer-events-none opacity-40',
          )}
        >
          <Upload className="h-4 w-4 text-ink-faint" />
          {file ? (
            <span className="font-semibold text-ink">{file.name}</span>
          ) : (
            <span className="text-ink-muted">
              영상 파일 선택 (mp4, mov, webm, mkv)
            </span>
          )}
        </label>
        <input
          id="source-file"
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/x-matroska,.mp4,.mov,.m4v,.webm,.mkv"
          className="sr-only"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />

        <p className="mt-4 text-xs leading-relaxed text-ink-faint">
          본인이 만들었거나 이용 허락을 받은 영상만 올려주세요. 업로드한 원본은
          작업이 끝난 뒤 일정 기간이 지나면 삭제됩니다.
        </p>
      </fieldset>

      {/* Reconstruct-only settings */}
      {mode === 'RECONSTRUCT' && (
        <fieldset className="surface-card p-6">
          <legend className="sr-only">재구성 설정</legend>
          <h2 className="text-base font-bold">재구성 설정</h2>

          <div className="mt-5">
            <div className="flex items-baseline justify-between">
              <label htmlFor="target-minutes" className="text-sm font-medium text-ink-soft">
                결과물 길이
              </label>
              <span className="text-2xl font-extrabold text-brand-700">
                {targetMinutes}
                <span className="ml-0.5 text-base font-bold text-ink-muted">분</span>
              </span>
            </div>
            <input
              id="target-minutes"
              type="range"
              min={MIN_TARGET_MINUTES}
              max={MAX_TARGET_MINUTES}
              step={1}
              value={targetMinutes}
              onChange={(event) => setTargetMinutes(Number(event.target.value))}
              aria-valuetext={`${targetMinutes}분`}
              className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-canvas-sunk accent-brand-600"
            />
            <div className="mt-1.5 flex justify-between text-xs text-ink-faint">
              <span>{MIN_TARGET_MINUTES}분</span>
              <span>{MAX_TARGET_MINUTES}분</span>
            </div>
            <p className="mt-3 text-xs text-ink-muted">
              장면 약 {estimateSceneCount(targetMinutes)}개 · 새 대본 약{' '}
              {estimateScriptCharacters(targetMinutes, speechRate).toLocaleString(
                'ko-KR',
              )}
              자로 계획됩니다. 원본이 이보다 많이 짧으면 작업이 중단됩니다.
            </p>
          </div>

          <div className="mt-6">
            <label htmlFor="voice" className="text-sm font-medium text-ink-soft">
              새 목소리
            </label>
            <select
              id="voice"
              value={voiceId}
              onChange={(event) => setVoiceId(event.target.value)}
              className="mt-2 h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-[0.95rem] outline-none focus:border-brand-400"
            >
              {voices.map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voice.label} — {voice.description}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-6">
            <span className="text-sm font-medium text-ink-soft">말 속도</span>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {speechRates.map((rate) => (
                <ChipButton
                  key={rate.id}
                  active={speechRate === rate.id}
                  onClick={() => setSpeechRate(rate.id)}
                  label={rate.label}
                />
              ))}
            </div>
          </div>
        </fieldset>
      )}

      {/* Output settings */}
      <fieldset className="surface-card p-6">
        <legend className="sr-only">출력 설정</legend>
        <h2 className="text-base font-bold">출력 설정</h2>

        <div className="mt-5">
          <span className="text-sm font-medium text-ink-soft">화면 비율</span>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {ratios.map((ratio) => (
              <ChipButton
                key={ratio.id}
                active={aspectRatio === ratio.id}
                onClick={() => setAspectRatio(ratio.id)}
                label={ratio.label}
                hint={ratio.hint}
              />
            ))}
          </div>
        </div>

        <div className="mt-6">
          <span className="text-sm font-medium text-ink-soft">자막 스타일</span>
          <div className="mt-2 grid gap-2 sm:grid-cols-4">
            {captionStyles.map((style) => (
              <ChipButton
                key={style.id}
                active={captionStyle === style.id}
                onClick={() => setCaptionStyle(style.id)}
                label={style.label}
                hint={style.hint}
              />
            ))}
          </div>
        </div>
      </fieldset>

      {error && (
        <p
          role="alert"
          className="rounded-2xl border border-coral-200 bg-coral-50 px-4 py-3 text-sm font-medium text-coral-700"
        >
          {error}
        </p>
      )}

      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              {busyLabel || '처리 중...'}
            </>
          ) : (
            '작업 시작하기'
          )}
        </Button>
        <p className="text-sm text-ink-muted">
          요금은 없습니다. 결과가 마음에 안 들면 다시 돌리셔도 됩니다.
        </p>
      </div>
    </form>
  );
}

function ModeCard({
  active,
  onClick,
  icon,
  title,
  detail,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-3xl border p-5 text-left transition',
        active
          ? 'border-brand-400 bg-brand-50/60 ring-2 ring-brand-200'
          : 'border-black/[0.08] hover:border-brand-200 hover:bg-canvas-soft',
      )}
    >
      <span
        className={cn(
          'inline-flex h-10 w-10 items-center justify-center rounded-2xl',
          active ? 'bg-brand-gradient text-white' : 'bg-canvas-sunk text-ink-muted',
        )}
      >
        {icon}
      </span>
      <h3 className="mt-3 text-[0.95rem] font-bold">{title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{detail}</p>
    </button>
  );
}

function ChipButton({
  active,
  onClick,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-2xl border px-3 py-2.5 text-center transition',
        active
          ? 'border-brand-400 bg-brand-50/60 text-brand-800'
          : 'border-black/[0.08] text-ink-soft hover:border-brand-200',
      )}
    >
      <span className="block text-sm font-semibold">{label}</span>
      {hint && <span className="mt-0.5 block text-[0.7rem] text-ink-faint">{hint}</span>}
    </button>
  );
}
