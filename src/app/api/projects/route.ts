import { NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { enqueueRender } from '@/lib/queue';
import { ensureProjectDirs } from '@/lib/storage';
import { createProjectSchema } from '@/lib/validation';
import { youtubeVideoId } from '@/lib/video-url';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const userId = await requireUserId();
    const projects = await prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { outputs: { select: { id: true, kind: true } } },
    });
    return NextResponse.json({ projects });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const parsed = createProjectSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? '입력값을 확인해 주세요.' },
        { status: 400 },
      );
    }

    const input = parsed.data;
    const title =
      input.title ||
      (input.sourceUrl
        ? (youtubeVideoId(input.sourceUrl) ?? '가져온 영상')
        : '업로드한 영상');

    const project = await prisma.project.create({
      data: {
        userId,
        mode: input.mode,
        title,
        sourceKind: input.sourceUrl ? 'URL' : 'UPLOAD',
        sourceUrl: input.sourceUrl ?? null,
        sourcePath: input.uploadPath ?? null,
        targetMinutes: input.mode === 'RECONSTRUCT' ? input.targetMinutes : null,
        voiceId: input.mode === 'RECONSTRUCT' ? (input.voiceId ?? null) : null,
        speechRate: input.mode === 'RECONSTRUCT' ? (input.speechRate ?? 'normal') : null,
        captionStyle: input.captionStyle ?? 'clean',
        aspectRatio: input.aspectRatio,
        language: input.language,
      },
    });

    await ensureProjectDirs(project.id);

    try {
      await enqueueRender(project.id);
    } catch (error) {
      // Redis being down should surface as a failed project rather than a lost one.
      await prisma.project.update({
        where: { id: project.id },
        data: {
          status: 'FAILED',
          failureCode: 'QUEUE_UNAVAILABLE',
          failureHint:
            '작업 대기열에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.',
        },
      });
      throw error;
    }

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

function errorResponse(error: unknown) {
  const status =
    error && typeof error === 'object' && 'status' in error
      ? Number((error as { status: unknown }).status) || 500
      : 500;
  const message = error instanceof Error ? error.message : '처리 중 오류가 발생했습니다.';
  if (status === 500) console.error('[api/projects]', error);
  return NextResponse.json({ error: message }, { status });
}
