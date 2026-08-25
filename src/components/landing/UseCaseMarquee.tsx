import { ArrowRight } from 'lucide-react';

/**
 * Stands in for the logo wall most tools put here. We have no customer logos to
 * show and inventing them would be a lie, so the marquee carries before/after
 * transformations instead — same visual rhythm, nothing fabricated.
 */
const rowOne = [
  ['3시간 게임 방송', '하이라이트 쇼츠 여러 편'],
  ['1시간 강의 녹화', '6분 요약 영상'],
  ['제품 리뷰 롱폼', '세로 쇼츠 + 자막'],
  ['인터뷰 전체본', '핵심 발언 클립'],
  ['행사 스케치 원본', 'SNS용 홍보 영상'],
];

const rowTwo = [
  ['원본 목소리 제거', '새 내레이션'],
  ['원본 배경음 제거', '새 효과음 · BGM'],
  ['원본 자막 제거', '새 자막'],
  ['가로 16:9', '세로 9:16 리프레이밍'],
  ['말끊김 · 공백', '깔끔하게 정리'],
];

function Pill({ from, to }: { from: string; to: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-3 rounded-full border border-black/[0.07] bg-white px-5 py-3 text-sm shadow-card">
      <span className="text-ink-muted">{from}</span>
      <ArrowRight className="h-4 w-4 shrink-0 text-brand-400" />
      <span className="font-semibold text-ink">{to}</span>
    </span>
  );
}

function Row({
  items,
  direction,
}: {
  items: string[][];
  direction: 'left' | 'right';
}) {
  // Rendered twice so the -50% translate loops seamlessly.
  const doubled = [...items, ...items];
  return (
    <div className="mask-fade-x flex overflow-hidden">
      <div
        className={`flex w-max gap-3 pr-3 ${
          direction === 'left' ? 'animate-marquee-left' : 'animate-marquee-right'
        }`}
      >
        {doubled.map(([from, to], index) => (
          <Pill key={`${from}-${index}`} from={from} to={to} />
        ))}
      </div>
    </div>
  );
}

export function UseCaseMarquee() {
  return (
    <section className="border-y border-black/[0.06] bg-canvas-soft py-14">
      <div className="container-page">
        <p className="text-center text-sm font-semibold text-ink-faint">
          이런 작업을 대신합니다
        </p>
      </div>
      <div className="mt-8 flex flex-col gap-3">
        <Row items={rowOne} direction="left" />
        <Row items={rowTwo} direction="right" />
      </div>
    </section>
  );
}
