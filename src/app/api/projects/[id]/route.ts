import { NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { removeProjectFiles } from '@/lib/storage';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    const project = await prisma.project.findFirst({
      // Scoping by userId here is what stops one account reading another's project.
      where: { id, userId },
      include: {
        outputs: { orderBy: { createdAt: 'asc' } },
        events: { orderBy: { createdAt: 'asc' }, take: 100 },
      },
    });

    if (!project) {
      return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다.' }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    const project = await prisma.project.findFirst({ where: { id, userId } });
    if (!project) {
      return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다.' }, { status: 404 });
    }

    // Files first: a stale row is recoverable, an orphaned 2 GB render is not.
    await removeProjectFiles(id);
    await prisma.project.delete({ where: { id } });

    return NextResponse.json({ ok: true });
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
  if (status === 500) console.error('[api/projects/:id]', error);
  return NextResponse.json({ error: message }, { status });
}
