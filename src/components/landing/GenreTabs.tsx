'use client';

import { useState } from 'react';
import { genres, type Genre } from '@/content/site';
import { cn } from '@/lib/utils';

const accentRing: Record<string, string> = {
  brand: 'from-brand-500/15 to-brand-500/0 ring-brand-200',
  coral: 'from-coral-500/15 to-coral-500/0 ring-coral-200',
  mint: 'from-mint-500/15 to-mint-500/0 ring-mint-200',
};

export function GenreTabs() {
  const [activeId, setActiveId] = useState<Genre['id']>(genres[0].id);
  const active = genres.find((genre) => genre.id === activeId) ?? genres[0];

  return (
    <section className="bg-canvas py-20 sm:py-28">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <span className="section-eyebrow">장르별 편집</span>
          <h2 className="section-title mt-5">
            영상 종류에 따라 <span className="text-gradient">다르게</span>{' '}
            자릅니다
          </h2>
          <p className="section-lead">
            강의와 게임 방송을 같은 방식으로 자를 수는 없습니다. 내용을 먼저
            파악하고 그에 맞는 기준으로 편집합니다.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="영상 장르"
          className="mt-10 flex flex-wrap justify-center gap-2"
        >
          {genres.map((genre) => (
            <button
              key={genre.id}
              role="tab"
              type="button"
              id={`genre-tab-${genre.id}`}
              aria-selected={genre.id === activeId}
              aria-controls={`genre-panel-${genre.id}`}
              onClick={() => setActiveId(genre.id)}
              className={cn(
                'rounded-full border px-4 py-2.5 text-sm font-semibold transition',
                genre.id === activeId
                  ? 'border-transparent bg-ink text-white shadow-card'
                  : 'border-black/[0.08] bg-white text-ink-soft hover:border-brand-200 hover:text-brand-700',
              )}
            >
              {genre.label}
            </button>
          ))}
        </div>

        <div
          role="tabpanel"
          id={`genre-panel-${active.id}`}
          aria-labelledby={`genre-tab-${active.id}`}
          className={cn(
            'mx-auto mt-8 max-w-3xl animate-fade-up rounded-4xl bg-gradient-to-br p-8 ring-1 sm:p-12',
            accentRing[active.accent],
          )}
          key={active.id}
        >
          <h3 className="text-2xl font-bold leading-snug sm:text-[1.75rem]">
            {active.headline}
          </h3>
          <p className="mt-4 text-base leading-relaxed text-ink-soft">
            {active.detail}
          </p>
        </div>
      </div>
    </section>
  );
}
