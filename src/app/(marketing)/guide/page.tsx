import { ButtonLink } from '@/components/ui/Button';
import { MAX_TARGET_MINUTES, MIN_TARGET_MINUTES } from '@/lib/reconstruct-plan';

export const metadata = {
  title: '사용 가이드',
  description: 'ViralCut으로 쇼츠를 만들고 영상을 재구성하는 방법을 안내합니다.',
};

const shortsSteps = [
  {
    title: '영상을 넣습니다',
    body: '유튜브 주소를 붙여넣거나 파일을 올립니다. 말이 많은 영상일수록 고를 구간이 많아 결과가 좋습니다.',
  },
  {
    title: '"쇼츠 추출"을 고릅니다',
    body: '화면 비율과 자막 스타일을 정합니다. 세로 9:16이 기본이고, 필요하면 정사각이나 가로로 뽑을 수 있습니다.',
  },
  {
    title: '기다립니다',
    body: '받아쓰기 → 구간 선별 → 렌더링 순으로 진행됩니다. 창을 닫아도 작업은 계속되고, 프로젝트 화면에서 단계별 상태를 볼 수 있습니다.',
  },
  {
    title: '골라서 받습니다',
    body: '만들어진 클립 중 원하는 것만 내려받으세요. 자막 파일(SRT)은 따로 챙길 수 있습니다.',
  },
];

const reconstructSteps = [
  {
    title: '"영상 재구성"을 고릅니다',
    body: '이 모드는 화면만 남기고 소리와 자막을 전부 새로 만듭니다. 원본 목소리는 결과물에 남지 않습니다.',
  },
  {
    title: `길이를 ${MIN_TARGET_MINUTES}~${MAX_TARGET_MINUTES}분 사이로 정합니다`,
    body: '정한 길이에 맞춰 장면 수와 대본 분량이 함께 계산됩니다. 원본이 목표보다 많이 짧으면 작업이 중단되니, 그럴 땐 길이를 줄여 주세요.',
  },
  {
    title: '목소리와 말 속도를 고릅니다',
    body: '내레이션에 쓸 목소리를 고르고 속도를 정합니다. 속도를 바꾸면 필요한 대본 분량도 함께 조정됩니다.',
  },
  {
    title: '결과를 확인합니다',
    body: '완성 영상과 함께 새로 만든 자막(SRT), 새 대본(TXT)이 나옵니다. 대본만 따로 받아 다른 곳에 쓰셔도 됩니다.',
  },
];

const limits = [
  {
    title: '화면에 박힌 자막은 완전히 못 지웁니다',
    body: '영상 위에 픽셀로 새겨진 글자는 지우면 그 자리가 비어버립니다. ViralCut은 해당 영역을 흐리게 처리하고 그 위에 새 자막을 얹습니다. 자막이 별도 트랙으로 들어 있는 영상은 흔적 없이 제거됩니다.',
  },
  {
    title: '원본보다 훨씬 긴 결과물은 만들 수 없습니다',
    body: '없는 장면을 지어내지 않기 때문에, 목표 길이가 원본에 비해 지나치게 길면 작업을 시작하지 않습니다.',
  },
  {
    title: '권리는 직접 확보해 주세요',
    body: '본인이 만들었거나 이용 허락을 받은 영상만 올려주세요. 업로드한 영상에 대한 권리 확인은 이용자 책임입니다.',
  },
];

export default function GuidePage() {
  return (
    <div className="container-page max-w-3xl py-16 sm:py-24">
      <h1 className="text-3xl font-extrabold sm:text-4xl">사용 가이드</h1>
      <p className="mt-3 text-base leading-relaxed text-ink-muted">
        ViralCut에는 두 가지 모드가 있습니다. 하이라이트를 잘라내는{' '}
        <strong className="text-ink">쇼츠 추출</strong>, 그리고 소리와 자막을
        통째로 새로 만드는 <strong className="text-ink">영상 재구성</strong>
        입니다.
      </p>

      <Section title="쇼츠 추출" steps={shortsSteps} />
      <Section title="영상 재구성" steps={reconstructSteps} />

      <h2 className="mt-16 text-2xl font-bold">미리 알아두실 점</h2>
      <div className="mt-6 space-y-4">
        {limits.map((limit) => (
          <div
            key={limit.title}
            className="rounded-3xl border border-amber-200/70 bg-amber-50/60 p-6"
          >
            <h3 className="text-base font-bold text-amber-900">{limit.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-amber-900/80">
              {limit.body}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-14 rounded-4xl bg-brand-soft p-8 text-center">
        <h2 className="text-xl font-bold">준비되셨나요?</h2>
        <ButtonLink href="/app/new" className="mt-5">
          무료로 시작하기
        </ButtonLink>
      </div>
    </div>
  );
}

function Section({
  title,
  steps,
}: {
  title: string;
  steps: { title: string; body: string }[];
}) {
  return (
    <section className="mt-14">
      <h2 className="text-2xl font-bold">{title}</h2>
      <ol className="mt-6 space-y-4">
        {steps.map((step, index) => (
          <li key={step.title} className="surface-card flex gap-4 p-6">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-sm font-bold text-white">
              {index + 1}
            </span>
            <div>
              <h3 className="text-base font-bold">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                {step.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
