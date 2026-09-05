import { redirect } from 'next/navigation';
import { LogoMark } from '@/components/brand/Logo';
import { auth, hasConfiguredProviders, signIn } from '@/lib/auth';

export const metadata = { title: '로그인' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await auth();
  const { next } = await searchParams;
  if (session?.user) redirect(next ?? '/app');

  const configured = hasConfiguredProviders();

  return (
    <div className="container-page flex min-h-[70vh] max-w-md flex-col justify-center py-16">
      <div className="surface-card p-8 text-center">
        <LogoMark className="mx-auto h-12 w-12" id="login-mark" />
        <h1 className="mt-5 text-2xl font-bold">시작하기</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          결제 수단은 받지 않습니다. 작업 기록을 저장하기 위해서만 로그인이
          필요합니다.
        </p>

        {configured ? (
          <form
            action={async () => {
              'use server';
              await signIn('google', { redirectTo: next ?? '/app' });
            }}
            className="mt-8"
          >
            <button
              type="submit"
              className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-black/10 bg-white text-[0.95rem] font-semibold text-ink transition hover:border-brand-300 hover:bg-canvas-soft"
            >
              <GoogleMark />
              Google 계정으로 계속하기
            </button>
          </form>
        ) : (
          <p className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-left text-sm leading-relaxed text-amber-800">
            로그인 수단이 설정되지 않았습니다. 서버의 <code>.env</code>에{' '}
            <code>AUTH_GOOGLE_ID</code>와 <code>AUTH_GOOGLE_SECRET</code>을
            넣은 뒤 다시 시작해 주세요.
          </p>
        )}

        <p className="mt-6 text-xs leading-relaxed text-ink-faint">
          계속 진행하면 본인이 권리를 가진 영상만 업로드한다는 데 동의하는 것으로
          봅니다.
        </p>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3a7.2 7.2 0 0 1-10.7-3.8h-4v3.1A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.3 14.3a7.1 7.1 0 0 1 0-4.6v-3.1h-4a12 12 0 0 0 0 10.8l4-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.5-3.5A12 12 0 0 0 1.3 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8z"
      />
    </svg>
  );
}
