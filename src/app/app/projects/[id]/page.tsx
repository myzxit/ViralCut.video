import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { ProjectDetail, type ProjectView } from '@/components/app/ProjectDetail';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const project = await prisma.project.findFirst({
    where: { id, userId: session!.user!.id },
    include: {
      outputs: { orderBy: { createdAt: 'asc' } },
      events: { orderBy: { createdAt: 'asc' }, take: 100 },
    },
  });

  if (!project) notFound();

  // Dates do not survive the server/client boundary as Date objects.
  const view: ProjectView = {
    id: project.id,
    title: project.title,
    mode: project.mode,
    status: project.status,
    progress: project.progress,
    stage: project.stage,
    targetMinutes: project.targetMinutes,
    sourceDurationSec: project.sourceDurationSec,
    failureHint: project.failureHint,
    outputs: project.outputs.map((output) => ({
      id: output.id,
      kind: output.kind,
      label: output.label,
      mimeType: output.mimeType,
      bytes: output.bytes,
      durationSec: output.durationSec,
      width: output.width,
      height: output.height,
    })),
    events: project.events.map((event) => ({
      id: event.id,
      stage: event.stage,
      message: event.message,
      level: event.level,
      createdAt: event.createdAt.toISOString(),
    })),
  };

  return (
    <div className="container-page max-w-4xl">
      <Link
        href="/app"
        className="inline-flex items-center gap-1 text-sm font-medium text-ink-muted transition hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" />내 프로젝트
      </Link>
      <div className="mt-5">
        <ProjectDetail initial={view} />
      </div>
    </div>
  );
}
