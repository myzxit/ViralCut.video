import { ButtonLink } from '@/components/ui/Button';
import { FaqAccordion } from '@/components/landing/FaqAccordion';
import { site } from '@/content/site';

export const metadata = {
  title: '자주 묻는 질문',
  description: 'ViralCut의 요금, 재구성 기능, 결과물 사용 범위에 대한 안내입니다.',
};

export default function FaqPage() {
  return (
    <div className="container-page max-w-3xl py-16 sm:py-24">
      <h1 className="text-3xl font-extrabold sm:text-4xl">자주 묻는 질문</h1>
      <p className="mt-3 text-base text-ink-muted">
        여기서 답을 못 찾으셨다면{' '}
        <a
          href={`mailto:${site.supportEmail}`}
          className="font-semibold text-brand-700 hover:underline"
        >
          {site.supportEmail}
        </a>
        으로 물어봐 주세요.
      </p>

      <FaqAccordion className="mt-10" />

      <div className="mt-14 rounded-4xl bg-brand-soft p-8 text-center">
        <h2 className="text-xl font-bold">직접 해보는 게 제일 빠릅니다</h2>
        <p className="mt-2 text-sm text-ink-muted">
          요금이 없으니 잃을 것도 없습니다.
        </p>
        <ButtonLink href="/app/new" className="mt-6">
          무료로 시작하기
        </ButtonLink>
      </div>
    </div>
  );
}
