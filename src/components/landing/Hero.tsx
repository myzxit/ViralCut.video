'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ArrowRight, Check, Link2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { heroBadges, heroStats } from '@/content/site';
import { isLikelyVideoUrl } from '@/lib/video-url';

export function Hero() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) {
      setError('영상 주소를 입력해 주세요.');
      return;
    }
    if (!isLikelyVideoUrl(trimmed)) {
      setError('영상 주소 형식이 아닙니다. 유튜브 링크를 붙여넣어 주세요.');
      return;
    }
    setError(null);
    router.push(`/app/new?mode=shorts&url=${encodeURIComponent(trimmed)}`);
  }

  return (
    <section className="relative overflow-hidden bg-brand-soft pb-20 pt-14 sm:pb-28 sm:pt-20">
      {/* Soft light behind the headline — kept as blurred blobs so it scales cleanly. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-brand-300/40 blur-3xl" />
        <div className="absolute -right-16 top-24 h-80 w-80 rounded-full bg-coral-200/50 blur-3xl" />
      </div>

      <div className="container-page relative">
        <div className="mx-auto max-w-3xl text-center">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {heroBadges.map((badge) => (
              <span
                key={badge.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-ink-soft shadow-sm backdrop-blur"
              >
                <Check className="h-3.5 w-3.5 text-mint-600" />
                {badge.label}
                <span className="font-normal text-ink-faint">
                  {badge.detail}
                </span>
              </span>
            ))}
          </div>

          <h1 className="mt-7 text-[2.1rem] font-extrabold leading-[1.24] sm:text-5xl lg:text-[3.4rem]">
            긴 영상을 <span className="text-gradient">쇼츠로 자르고</span>,
            <br className="hidden sm:block" /> 소리까지{' '}
            <span className="text-gradient">새로 입힙니다</span>
          </h1>

          <p className="section-lead mx-auto max-w-2xl">
            주소 한 줄만 붙여넣으세요. 하이라이트를 골라 쇼츠로 만들거나, 원본
            소리와 자막을 걷어내고 새 목소리·효과음·자막으로 다시 만들어
            드립니다.
          </p>

          <form onSubmit={handleSubmit} className="mx-auto mt-9 max-w-2xl">
            <div className="flex flex-col gap-2.5 rounded-3xl border border-white/80 bg-white/90 p-2.5 shadow-glow backdrop-blur sm:flex-row sm:items-center sm:rounded-full">
              <label htmlFor="hero-url" className="sr-only">
                영상 주소
              </label>
              <div className="flex flex-1 items-center gap-2.5 px-4">
                <Link2 className="h-5 w-5 shrink-0 text-ink-faint" />
                <input
                  id="hero-url"
                  type="url"
                  inputMode="url"
                  value={url}
                  onChange={(event) => {
                    setUrl(event.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="https://youtube.com/watch?v=..."
                  className="h-12 w-full bg-transparent text-base text-ink outline-none placeholder:text-ink-faint"
                />
              </div>
              <Button type="submit" size="md" className="h-12 shrink-0 px-6">
                시작하기
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            {error && (
              <p role="alert" className="mt-3 text-sm font-medium text-coral-600">
                {error}
              </p>
            )}

            <p className="mt-4 text-sm text-ink-muted">
              <a
                href="/app/new?mode=reconstruct"
                className="inline-flex items-center gap-1.5 font-semibold text-brand-700 underline-offset-4 hover:underline"
              >
                <Upload className="h-4 w-4" />
                파일로 올리기
              </a>
              <span className="mx-2 text-ink-faint">·</span>
              회원가입만 하면 바로 씁니다. 결제 수단은 받지 않습니다.
            </p>
          </form>

          <dl className="mx-auto mt-14 grid max-w-2xl grid-cols-3 gap-4">
            {heroStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/70 bg-white/70 px-3 py-4 backdrop-blur"
              >
                <dt className="sr-only">{stat.label}</dt>
                <dd>
                  <span className="block text-2xl font-extrabold text-ink sm:text-3xl">
                    {stat.value}
                  </span>
                  <span className="mt-1 block text-xs font-medium text-ink-soft sm:text-sm">
                    {stat.label}
                  </span>
                  <span className="mt-0.5 block text-[0.7rem] text-ink-faint">
                    {stat.sub}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
