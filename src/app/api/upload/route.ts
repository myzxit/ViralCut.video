import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth';
import { config } from '@/lib/config';
import { formatBytes } from '@/lib/utils';

export const runtime = 'nodejs';
/** Uploads are long; never let the platform cache or statically optimise this. */
export const dynamic = 'force-dynamic';

const ALLOWED_EXTENSIONS = new Set(['.mp4', '.mov', '.m4v', '.webm', '.mkv']);

/**
 * Accept a source file and hand back the path to reference when creating a project.
 *
 * The file is streamed to disk rather than buffered — a 2 GB upload read into memory
 * would take the server down.
 */
export async function POST(request: Request) {
  let destPath: string | null = null;
  try {
    const userId = await requireUserId();

    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 });
    }

    const extension = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      return NextResponse.json(
        { error: `지원하지 않는 형식입니다. ${[...ALLOWED_EXTENSIONS].join(', ')}만 올릴 수 있습니다.` },
        { status: 400 },
      );
    }
    if (file.size > config.limits.maxUploadBytes) {
      return NextResponse.json(
        { error: `파일이 너무 큽니다. 최대 ${formatBytes(config.limits.maxUploadBytes)}까지 올릴 수 있습니다.` },
        { status: 413 },
      );
    }

    // Land uploads in a per-user staging area; the project claims the path on create.
    const stagingDir = path.join(
      path.resolve(config.storageDir),
      'uploads',
      path.basename(userId),
    );
    await mkdir(stagingDir, { recursive: true });

    // Never trust the client's filename for the path on disk.
    destPath = path.join(stagingDir, `${randomUUID()}${extension}`);

    await pipeline(
      Readable.fromWeb(file.stream() as Parameters<typeof Readable.fromWeb>[0]),
      createWriteStream(destPath),
    );

    return NextResponse.json({
      uploadPath: destPath,
      bytes: file.size,
      originalName: file.name,
    });
  } catch (error) {
    // A half-written file is worse than none — the probe would report a broken source.
    if (destPath) await rm(destPath, { force: true }).catch(() => undefined);

    const status =
      error && typeof error === 'object' && 'status' in error
        ? Number((error as { status: unknown }).status) || 500
        : 500;
    if (status === 500) console.error('[api/upload]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '업로드에 실패했습니다.' },
      { status },
    );
  }
}
