import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LogOut, Plus } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { ButtonLink } from '@/components/ui/Button';
import { auth, signOut } from '@/lib/auth';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login?next=/app');
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas-soft">
      <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-white/85 backdrop-blur-xl">
        <div className="container-page flex h-[4.5rem] items-center justify-between">
          <Link href="/app" aria-label="내 프로젝트">
            <Logo />
          </Link>

          <div className="flex items-center gap-2">
            <ButtonLink href="/app/new" size="sm">
              <Plus className="h-4 w-4" />
              새 작업
            </ButtonLink>

            <form
              action={async () => {
                'use server';
                await signOut({ redirectTo: '/' });
              }}
            >
              <button
                type="submit"
                aria-label="로그아웃"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-faint transition hover:bg-canvas-sunk hover:text-ink"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1 py-10">
        {children}
      </main>
    </div>
  );
}
