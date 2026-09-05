import { ArrowRight } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';

const promises = ['요금 없음', '워터마크 없음', '결제 수단 등록 없음'];

export function FinalCta() {
  return (
    <section className="bg-canvas pb-24">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-5xl bg-brand-gradient px-6 py-16 text-center sm:px-12 sm:py-20">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-30"
          >
            <div className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/40 blur-3xl" />
            <div className="absolute -bottom-20 -right-10 h-72 w-72 rounded-full bg-white/30 blur-3xl" />
          </div>

          <div className="relative">
            <h2 className="text-3xl font-extrabold leading-[1.3] text-white sm:text-[2.6rem]">
              다음 영상은
              <br className="sm:hidden" /> 직접 자르지 마세요
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
              주소 하나 붙여넣고 결과물을 받아보세요. 마음에 안 들면 몇 번이든
              다시 돌려도 됩니다.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ButtonLink
                href="/app/new"
                size="lg"
                variant="secondary"
                className="w-full bg-white text-ink hover:bg-white/90 sm:w-auto"
              >
                무료로 시작하기
                <ArrowRight className="h-5 w-5" />
              </ButtonLink>
              <ButtonLink
                href="/guide"
                size="lg"
                variant="ghost"
                className="w-full text-white hover:bg-white/15 hover:text-white sm:w-auto"
              >
                사용 방법 보기
              </ButtonLink>
            </div>

            <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/80">
              {promises.map((promise) => (
                <li key={promise}>{promise}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
