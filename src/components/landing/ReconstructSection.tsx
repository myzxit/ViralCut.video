'use client';

import { useState } from 'react';
import { ArrowRight, AudioLines, Captions, Mic, Music, VolumeX } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { reconstructSteps } from '@/content/site';
import {
  MAX_TARGET_MINUTES,
  MIN_TARGET_MINUTES,
  estimateScriptCharacters,
  estimateSceneCount,
} from '@/lib/reconstruct-plan';

/** What gets removed from the source, paired with what replaces it. */
const swaps = [
  {
    icon: VolumeX,
    removed: '원본 목소리',
    added: '새 내레이션',
    addedIcon: Mic,
  },
  {
    icon: VolumeX,
    removed: '원본 효과음 · 배경음',
    added: '새 효과음 · 배경음악',
    addedIcon: Music,
  },
  {
    icon: VolumeX,
    removed: '원본 자막',
    added: '새 자막',
    addedIcon: Captions,
  },
] as const;

export function ReconstructSection() {
  const [minutes, setMinutes] = useState(6);

  const scenes = estimateSceneCount(minutes);
  const characters = estimateScriptCharacters(minutes);

  return (
    <section
      id="reconstruct"
      className="relative overflow-hidden bg-ink py-20 text-white sm:py-28"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
      >
        <div className="absolute -left-32 top-10 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-coral-500/20 blur-3xl" />
      </div>

      <div className="container-page relative">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/90">
            <AudioLines className="h-3.5 w-3.5" />
            ViralCut에만 있는 기능
          </span>
          <h2 className="section-title mt-6 text-white">
            화면만 남기고,
            <br />
            소리와 자막은 <span className="text-gradient">전부 새로</span>
          </h2>
          <p className="section-lead text-white/70">
            원본의 목소리·효과음·자막을 걷어낸 뒤, 내용을 이해해서 새 대본을
            쓰고 새 목소리로 읽고 새 효과음과 자막을 입혀 한 편의 영상으로
            다시 만들어냅니다.
          </p>
        </div>

        {/* Removed → added */}
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {swaps.map((swap) => (
            <div
              key={swap.removed}
              className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur"
            >
              <div className="flex items-center gap-2 text-sm text-white/50">
                <swap.icon className="h-4 w-4" />
                <span className="line-through decoration-coral-400/70 decoration-2">
                  {swap.removed}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-base font-semibold text-white">
                <swap.addedIcon className="h-4.5 w-4.5 text-mint-300" />
                {swap.added}
              </div>
            </div>
          ))}
        </div>

        {/* Length control — the actual product control, previewed on the landing page. */}
        <div className="mt-8 rounded-4xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <label
                htmlFor="length-preview"
                className="text-sm font-semibold text-white/70"
              >
                결과물 길이
              </label>
              <p className="mt-1 text-4xl font-extrabold text-white">
                {minutes}
                <span className="ml-1 text-xl font-bold text-white/60">분</span>
              </p>
            </div>
            <div className="flex gap-6 text-right">
              <div>
                <p className="text-xs text-white/50">장면 수</p>
                <p className="text-lg font-bold text-white">약 {scenes}개</p>
              </div>
              <div>
                <p className="text-xs text-white/50">새 대본 분량</p>
                <p className="text-lg font-bold text-white">
                  약 {characters.toLocaleString('ko-KR')}자
                </p>
              </div>
            </div>
          </div>

          <input
            id="length-preview"
            type="range"
            min={MIN_TARGET_MINUTES}
            max={MAX_TARGET_MINUTES}
            step={1}
            value={minutes}
            onChange={(event) => setMinutes(Number(event.target.value))}
            aria-valuetext={`${minutes}분`}
            className="mt-6 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-brand-400"
          />
          <div className="mt-2 flex justify-between text-xs text-white/45">
            <span>{MIN_TARGET_MINUTES}분</span>
            <span>{MAX_TARGET_MINUTES}분</span>
          </div>
        </div>

        {/* Pipeline steps */}
        <ol className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reconstructSteps.map((step, index) => (
            <li
              key={step.key}
              className="rounded-3xl border border-white/10 bg-white/[0.04] p-6"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-gradient text-sm font-bold text-white">
                {index + 1}
              </span>
              <h3 className="mt-4 text-lg font-bold text-white">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/65">
                {step.detail}
              </p>
            </li>
          ))}
        </ol>

        <div className="mt-10">
          <ButtonLink href="/app/new?mode=reconstruct" size="lg">
            재구성 해보기
            <ArrowRight className="h-5 w-5" />
          </ButtonLink>
          <p className="mt-3 text-sm text-white/50">
            화면에 박힌 자막은 완전히 지울 수 없어 가림 처리됩니다.
          </p>
        </div>
      </div>
    </section>
  );
}
