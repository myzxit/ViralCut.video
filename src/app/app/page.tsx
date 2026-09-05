import Link from 'next/link';
import { AudioLines, Film, Plus } from 'lucide-react';
import { StatusBadge } from '@/components/app/StatusBadge';
import { ButtonLink } from '@/components/ui/Button';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatDuration } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata = { title: '내 프로젝트' };

export default async function DashboardPage() {
  const session = await auth();
  const projects = await prisma.project.findMany({
    where: { userId: session!.user!.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { _count: { select: { outputs: true } } },
  });

  return (
    <div className="container-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">내 프로젝트</h1>
          <p className="mt-2 text-sm text-ink-muted">
            작업은 창을 닫아도 계속됩니다. 다시 들어와 확인하세요.
          </p>
        </div>
        <ButtonLink href="/app/new">
          <Plus className="h-4 w-4" />새 작업 만들기
        </ButtonLink>
      </div>

      {projects.length === 0 ? (
        <div className="mt-10 rounded-4xl border border-dashed border-black/10 bg-white/60 px-6 py-20 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <Film className="h-6 w-6" />
          </span>
          <h2 className="mt-5 text-lg font-bold">아직 만든 영상이 없습니다</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">
            유튜브 링크를 붙여넣거나 영상 파일을 올려 첫 작업을 시작해 보세요.
            요금은 없습니다.
          </p>
          <ButtonLink href="/app/new" className="mt-7">
            시작하기
          </ButtonLink>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                href={`/app/projects/${project.id}`}
                className="surface-card block h-full p-6 transition hover:-translate-y-0.5 hover:shadow-lift"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                    {project.mode === 'RECONSTRUCT' ? (
                      <AudioLines className="h-5 w-5" />
                    ) : (
                      <Film className="h-5 w-5" />
                    )}
                  </span>
                  <StatusBadge status={project.status} />
                </div>

                <h2 className="mt-4 line-clamp-2 text-base font-bold leading-snug">
                  {project.title}
                </h2>

                <p className="mt-1.5 text-xs text-ink-faint">
                  {project.mode === 'RECONSTRUCT'
                    ? `재구성 · ${project.targetMinutes ?? '?'}분 목표`
                    : '쇼츠 추출'}
                  {project.sourceDurationSec
                    ? ` · 원본 ${formatDuration(project.sourceDurationSec)}`
                    : ''}
                </p>

                {project.status === 'RUNNING' && (
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-canvas-sunk">
                    <div
                      className="h-full rounded-full bg-brand-gradient transition-all"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                )}

                {project.status === 'COMPLETED' && (
                  <p className="mt-4 text-xs font-semibold text-mint-700">
                    결과물 {project._count.outputs}개
                  </p>
                )}

                {project.status === 'FAILED' && (
                  <p className="mt-4 line-clamp-2 text-xs text-coral-600">
                    {project.failureHint ?? '작업에 실패했습니다.'}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
