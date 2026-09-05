import type { ProjectStatus } from '@prisma/client';
import { cn } from '@/lib/utils';

const LABELS: Record<ProjectStatus, { text: string; className: string }> = {
  QUEUED: { text: '대기 중', className: 'bg-canvas-sunk text-ink-muted' },
  RUNNING: { text: '작업 중', className: 'bg-brand-50 text-brand-700' },
  COMPLETED: { text: '완료', className: 'bg-mint-50 text-mint-700' },
  FAILED: { text: '실패', className: 'bg-coral-50 text-coral-700' },
  CANCELLED: { text: '취소됨', className: 'bg-canvas-sunk text-ink-faint' },
};

export function StatusBadge({
  status,
  className,
}: {
  status: ProjectStatus;
  className?: string;
}) {
  const label = LABELS[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        label.className,
        className,
      )}
    >
      {status === 'RUNNING' && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-brand-500" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-600" />
        </span>
      )}
      {label.text}
    </span>
  );
}

export const STAGE_LABELS: Record<string, string> = {
  ingest: '원본 준비',
  separate: '원본 소리 분리 · 제거',
  transcribe: '내용 받아쓰기',
  script: '새 대본 작성',
  voice: '새 목소리 생성',
  sound: '효과음 · 배경음악',
  captions: '새 자막 생성',
  select: '하이라이트 선별',
  render: '영상 렌더링',
  done: '완료',
  failed: '실패',
};
