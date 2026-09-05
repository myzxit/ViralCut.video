import { Suspense } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { CreateProjectForm } from '@/components/app/CreateProjectForm';
import { resolveProviders } from '@/lib/providers';

export const metadata = { title: '새 작업' };

export default function NewProjectPage() {
  const providers = resolveProviders();

  return (
    <div className="container-page max-w-3xl">
      <Link
        href="/app"
        className="inline-flex items-center gap-1 text-sm font-medium text-ink-muted transition hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" />내 프로젝트
      </Link>

      <h1 className="mt-4 text-2xl font-bold sm:text-3xl">새 작업 만들기</h1>
      <p className="mt-2 text-sm text-ink-muted">
        영상을 넣고 만들 방식을 고르면 됩니다.
      </p>

      <div className="mt-8">
        {/* useSearchParams needs a boundary so the shell can still prerender. */}
        <Suspense fallback={<FormSkeleton />}>
          <CreateProjectForm
            voices={[...providers.tts.voices]}
            usingMocks={providers.usingMocks}
          />
        </Suspense>
      </div>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-6">
      {[180, 260, 220].map((height) => (
        <div
          key={height}
          className="animate-pulse rounded-3xl bg-white/70"
          style={{ height }}
        />
      ))}
    </div>
  );
}
