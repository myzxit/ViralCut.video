import {
  AudioLines,
  Captions,
  FileDown,
  Languages,
  LayoutTemplate,
  ListVideo,
  Palette,
  ScanFace,
  Scissors,
  Sparkles,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { extras, features, personas, testimonials, workflow } from '@/content/site';

const icons: Record<string, LucideIcon> = {
  Sparkles,
  Captions,
  Scissors,
  Zap,
  ScanFace,
  AudioLines,
  Palette,
  FileDown,
  Languages,
  LayoutTemplate,
  ListVideo,
};

export function WorkflowSection() {
  return (
    <section className="bg-canvas-soft py-20 sm:py-28">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <span className="section-eyebrow">사용 방법</span>
          <h2 className="section-title mt-5">
            준비물은 <span className="text-gradient">영상 하나</span>뿐입니다
          </h2>
          <p className="section-lead">
            설치할 프로그램도, 배워야 할 편집 도구도 없습니다.
          </p>
        </div>

        <ol className="mt-12 grid gap-5 md:grid-cols-3">
          {workflow.map((item) => (
            <li key={item.step} className="surface-card p-7">
              <span className="text-sm font-extrabold tracking-widest text-brand-500">
                {item.step}
              </span>
              <h3 className="mt-3 text-xl font-bold leading-snug">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                {item.detail}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function FeaturesSection() {
  return (
    <section id="features" className="bg-canvas py-20 sm:py-28">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <span className="section-eyebrow">편집 기능</span>
          <h2 className="section-title mt-5">
            손으로 하던 작업을{' '}
            <span className="text-gradient">그대로 대신합니다</span>
          </h2>
          <p className="section-lead">
            자막 찍고, 공백 자르고, 인물 따라 화면 옮기는 일 전부입니다.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = icons[feature.icon] ?? Sparkles;
            return (
              <div
                key={feature.title}
                className="surface-card group p-6 transition hover:-translate-y-0.5 hover:shadow-lift"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-gradient group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-bold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  {feature.detail}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function PersonaSection() {
  return (
    <section className="bg-canvas-soft py-20 sm:py-28">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <span className="section-eyebrow">이런 분들께</span>
          <h2 className="section-title mt-5">
            편집할 시간이 <span className="text-gradient">없으셨다면</span>
          </h2>
          <p className="section-lead">
            찍어둔 영상은 쌓이는데 손댈 여유가 없다는 이야기를 가장 많이
            듣습니다.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {personas.map((persona) => (
            <div key={persona.role} className="surface-card p-7">
              <h3 className="text-lg font-bold">{persona.role}</h3>
              <p className="mt-3 border-l-2 border-brand-200 pl-4 text-sm leading-relaxed text-ink-soft">
                {persona.pain}
              </p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {persona.wins.map((win) => (
                  <li
                    key={win}
                    className="rounded-full bg-mint-50 px-3 py-1.5 text-xs font-semibold text-mint-700"
                  >
                    {win}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TestimonialSection() {
  return (
    <section className="bg-canvas py-20 sm:py-28">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <span className="section-eyebrow">사용 후기</span>
          <h2 className="section-title mt-5">
            직접 써본 <span className="text-gradient">이야기</span>
          </h2>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {testimonials.map((item) => (
            <figure key={item.quote} className="surface-card flex flex-col p-7">
              <blockquote className="flex-1 text-base leading-relaxed text-ink-soft">
                “{item.quote}”
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-black/[0.06] pt-5">
                <span
                  aria-hidden
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-gradient text-xs font-bold text-white"
                >
                  {item.author.slice(0, 2)}
                </span>
                <span className="text-sm">
                  <span className="block font-semibold text-ink">
                    {item.author}
                  </span>
                  <span className="block text-ink-faint">{item.context}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ExtrasSection() {
  return (
    <section className="bg-canvas-soft py-20 sm:py-28">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <span className="section-eyebrow">그 외</span>
          <h2 className="section-title mt-5">
            만들고 나서 <span className="text-gradient">필요한 것들</span>
          </h2>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {extras.map((extra) => {
            const Icon = icons[extra.icon] ?? Sparkles;
            return (
              <div key={extra.title} className="surface-card p-7">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-coral-50 text-coral-600">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-bold">{extra.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  {extra.detail}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
