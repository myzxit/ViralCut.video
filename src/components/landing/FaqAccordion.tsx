'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { faqs } from '@/content/site';
import { cn } from '@/lib/utils';

export function FaqAccordion({
  items = faqs,
  className,
}: {
  items?: readonly { q: string; a: string }[];
  className?: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className={cn('mx-auto max-w-3xl divide-y divide-black/[0.07]', className)}>
      {items.map((item, index) => {
        const open = openIndex === index;
        return (
          <div key={item.q}>
            <h3>
              <button
                type="button"
                onClick={() => setOpenIndex(open ? null : index)}
                aria-expanded={open}
                aria-controls={`faq-panel-${index}`}
                className="flex w-full items-center justify-between gap-6 py-5 text-left"
              >
                <span className="text-base font-semibold text-ink sm:text-lg">
                  {item.q}
                </span>
                <Plus
                  className={cn(
                    'h-5 w-5 shrink-0 text-ink-faint transition-transform duration-200',
                    open && 'rotate-45 text-brand-600',
                  )}
                />
              </button>
            </h3>
            {open && (
              <div id={`faq-panel-${index}`} className="pb-6 pr-10">
                <p className="text-[0.95rem] leading-relaxed text-ink-muted">
                  {item.a}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function FaqSection() {
  return (
    <section id="faq" className="bg-canvas py-20 sm:py-28">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <span className="section-eyebrow">자주 묻는 질문</span>
          <h2 className="section-title mt-5">
            궁금하실 만한 것들을{' '}
            <span className="text-gradient">먼저 정리했습니다</span>
          </h2>
        </div>
        <FaqAccordion className="mt-12" />
      </div>
    </section>
  );
}
