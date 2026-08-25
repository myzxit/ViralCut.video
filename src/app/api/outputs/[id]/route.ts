import { Readable } from 'node:stream';
import { NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readStream } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/**
 * Serve a rendered file.
 *
 * Outputs live outside the public directory and are streamed through here so that
 * ownership is checked on every request — guessing an id gets you a 404, not a video.
 */
export async function GET(request: Request, { params }: Params) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    const output = await prisma.output.findFirst({
      where: { id, project: { userId } },
      include: { project: { select: { title: true } } },
    });

    if (!output) {
      return NextResponse.json({ error: '파일을 찾을 수 없습니다.' }, { status: 404 });
    }

    const disposition = new URL(request.url).searchParams.get('download') === '1'
      ? 'attachment'
      : 'inline';

    const stream = Readable.toWeb(
      readStream(output.path),
    ) as unknown as ReadableStream;

    return new NextResponse(stream, {
      headers: {
        'Content-Type': output.mimeType,
        'Content-Length': String(output.bytes),
        'Content-Disposition': `${disposition}; filename*=UTF-8''${encodeURIComponent(
          fileNameFor(output.label, output.mimeType),
        )}`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    const status =
      error && typeof error === 'object' && 'status' in error
        ? Number((error as { status: unknown }).status) || 500
        : 500;
    if (status === 500) console.error('[api/outputs/:id]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '파일을 읽지 못했습니다.' },
      { status },
    );
  }
}

const EXTENSION_BY_MIME: Record<string, string> = {
  'video/mp4': 'mp4',
  'application/x-subrip': 'srt',
  'text/plain': 'txt',
  'audio/wav': 'wav',
};

function fileNameFor(label: string, mimeType: string) {
  const safe = label.replace(/[/\\?%*:|"<>]/g, '-').trim() || 'viralcut';
  return `${safe}.${EXTENSION_BY_MIME[mimeType] ?? 'bin'}`;
}
