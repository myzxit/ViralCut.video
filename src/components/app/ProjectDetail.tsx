'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Download,
  FileText,
  Loader2,
  Play,
  Trash2,
} from 'lucide-react';
import { STAGE_LABELS, StatusBadge } from '@/components/app/StatusBadge';
import { Button } from '@/components/ui/Button';
import { formatBytes, formatDuration } from '@/lib/utils';

type Output = {
  id: string;
  kind: 'VIDEO' | 'SUBTITLE' | 'TRANSCRIPT' | 'AUDIO';
  label: string;
  mimeType: string;
  bytes: number;
  durationSec: number | null;
  width: number | null;
  height: number | null;
};

type Event = {
  id: string;
  stage: string;
  message: string;
  level: string;
  createdAt: string;
};

export type ProjectView = {
  id: string;
  title: string;
  mode: 'SHORTS' | 'RECONSTRUCT';
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progress: number;
  stage: string | null;
  targetMinutes: number | null;
  sourceDurationSec: number | null;
  failureHint: string | null;
  outputs: Output[];
  events: Event[];
};

const RECONSTRUCT_STAGES = [
  'ingest',
  'separate',
  'transcribe',
  'script',
  'voice',
  'sound',
  'captions',
  'render',
] as const;

const SHORTS_STAGES = ['ingest', 'transcribe', 'select', 'render'] as const;

export function ProjectDetail({ initial }: { initial: ProjectView }) {
  const router = useRouter();
  const [project, setProject] = useState(initial);
  const [deleting, setDeleting] = useState(false);

  const inFlight = project.status === 'QUEUED' || project.status === 'RUNNING';

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/projects/${initial.id}`, {
      cache: 'no-store',
    });
    if (!response.ok) return;
    const json = await response.json();
    setProject(json.project);
  }, [initial.id]);

  // Poll while work is happening. Renders take minutes, so 3s is responsive enough
  // without hammering the server; the interval stops as soon as the job settles.
  useEffect(() => {
    if (!inFlight) return;
    const timer = setInterval(refresh, 3000);
    return () => clearInterval(timer);
  }, [inFlight, refresh]);

  async function handleDelete() {
    if (!confirm('이 프로젝트와 결과물을 모두 삭제할까요? 되돌릴 수 없습니다.')) {
      return;
    }
    setDeleting(true);
    const response = await fetch(`/api/projects/${project.id}`, {
      method: 'DELETE',
    });
    if (response.ok) {
      router.push('/app');
      router.refresh();
    } else {
      setDeleting(false);
      alert('삭제하지 못했습니다.');
    }
  }

  const stages: readonly string[] =
    project.mode === 'RECONSTRUCT' ? RECONSTRUCT_STAGES : SHORTS_STAGES;
  const currentIndex = stages.indexOf(project.stage ?? 'ingest');

  const videos = project.outputs.filter((output) => output.kind === 'VIDEO');
  const files = project.outputs.filter((output) => output.kind !== 'VIDEO');

  return (
    <div className="space-y-6">
      <div className="surface-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <StatusBadge status={project.status} />
            <h1 className="mt-3 text-xl font-bold sm:text-2xl">{project.title}</h1>
            <p className="mt-1.5 text-sm text-ink-muted">
              {project.mode === 'RECONSTRUCT'
                ? `영상 재구성 · 목표 ${project.targetMinutes ?? '?'}분`
                : '쇼츠 추출'}
              {project.sourceDurationSec
                ? ` · 원본 ${formatDuration(project.sourceDurationSec)}`
                : ''}
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="text-ink-faint hover:text-coral-600"
          >
            <Trash2 className="h-4 w-4" />
            삭제
          </Button>
        </div>

        {inFlight && (
          <div className="mt-6">
            <div className="h-2 overflow-hidden rounded-full bg-canvas-sunk">
              <div
                className="h-full rounded-full bg-brand-gradient transition-all duration-500"
                style={{ width: `${Math.max(4, project.progress)}%` }}
              />
            </div>

            <ol className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {stages.map((stage, index) => {
                const done = index < currentIndex;
                const active = index === currentIndex;
                return (
                  <li
                    key={stage}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${
                      active
                        ? 'bg-brand-50 font-semibold text-brand-800'
                        : done
                          ? 'text-mint-700'
                          : 'text-ink-faint'
                    }`}
                  >
                    {done ? (
                      <Check className="h-3.5 w-3.5 shrink-0" />
                    ) : active ? (
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                    ) : (
                      <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-current opacity-40" />
                    )}
                    {STAGE_LABELS[stage] ?? stage}
                  </li>
                );
              })}
            </ol>

            <p className="mt-4 text-xs text-ink-faint">
              창을 닫아도 작업은 계속됩니다. 나중에 다시 들어와 확인하셔도 됩니다.
            </p>
          </div>
        )}

        {project.status === 'FAILED' && (
          <div className="mt-6 flex gap-3 rounded-2xl border border-coral-200 bg-coral-50 p-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-coral-600" />
            <div>
              <p className="text-sm font-semibold text-coral-800">
                작업이 실패했습니다
              </p>
              <p className="mt-1 text-sm text-coral-700">
                {project.failureHint ?? '원인을 확인할 수 없습니다.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {videos.length > 0 && (
        <div className="surface-card p-6">
          <h2 className="text-base font-bold">결과물</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((output) => (
              <figure key={output.id}>
                <video
                  controls
                  preload="metadata"
                  src={`/api/outputs/${output.id}`}
                  className="w-full rounded-2xl bg-ink"
                  style={{
                    aspectRatio:
                      output.width && output.height
                        ? `${output.width} / ${output.height}`
                        : '9 / 16',
                  }}
                />
                <figcaption className="mt-3">
                  <p className="text-sm font-semibold">{output.label}</p>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    {output.durationSec ? formatDuration(output.durationSec) : '—'} ·{' '}
                    {formatBytes(output.bytes)}
                  </p>
                  <a
                    href={`/api/outputs/${output.id}?download=1`}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:underline"
                  >
                    <Download className="h-3.5 w-3.5" />
                    내려받기
                  </a>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div className="surface-card p-6">
          <h2 className="text-base font-bold">자막 · 대본</h2>
          <ul className="mt-4 divide-y divide-black/[0.06]">
            {files.map((output) => (
              <li
                key={output.id}
                className="flex items-center justify-between gap-4 py-3"
              >
                <span className="flex items-center gap-2.5 text-sm">
                  <FileText className="h-4 w-4 shrink-0 text-ink-faint" />
                  {output.label}
                </span>
                <a
                  href={`/api/outputs/${output.id}?download=1`}
                  className="shrink-0 text-xs font-semibold text-brand-700 hover:underline"
                >
                  내려받기
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {project.events.length > 0 && (
        <div className="surface-card p-6">
          <h2 className="text-base font-bold">진행 기록</h2>
          <ol className="mt-4 space-y-3">
            {project.events.map((event) => (
              <li key={event.id} className="flex gap-3 text-sm">
                <span
                  aria-hidden
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                    event.level === 'error'
                      ? 'bg-coral-500'
                      : event.level === 'warn'
                        ? 'bg-amber-500'
                        : 'bg-brand-400'
                  }`}
                />
                <span>
                  <span className="text-xs font-semibold text-ink-faint">
                    {STAGE_LABELS[event.stage] ?? event.stage}
                  </span>
                  <span className="block text-ink-soft">{event.message}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {project.status === 'COMPLETED' && videos.length === 0 && (
        <div className="surface-card flex items-center gap-3 p-6 text-sm text-ink-muted">
          <Play className="h-4 w-4" />
          완료되었지만 내보낼 영상이 없습니다.
        </div>
      )}
    </div>
  );
}
