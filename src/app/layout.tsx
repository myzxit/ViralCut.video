import type { Metadata, Viewport } from 'next';
import { site } from '@/content/site';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(`https://${site.domain}`),
  title: {
    default: `${site.name} — 영상을 쇼츠로 자르고 소리까지 새로 입히는 도구`,
    template: `%s · ${site.name}`,
  },
  description:
    '유튜브 링크나 영상 파일만 올리면 하이라이트를 골라 쇼츠로 만들고, 원본 목소리·효과음·자막을 걷어낸 뒤 새 목소리와 자막으로 재구성합니다. 요금은 없습니다.',
  keywords: [
    '쇼츠 자동 제작',
    '영상 재구성',
    'AI 자막',
    '숏폼 편집',
    '무료 영상 편집',
  ],
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: site.name,
    title: `${site.name} — 영상을 다시 태어나게`,
    description:
      '하이라이트 쇼츠 추출과, 소리·자막을 통째로 새로 만드는 영상 재구성. 1분에서 25분까지 길이를 정할 수 있고 요금은 없습니다.',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#5b3df5',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        {/* Pretendard is the practical default for Korean UI; the stack in
            tailwind.config.ts falls back to system faces if this never loads. */}
        <link
          rel="preconnect"
          href="https://cdn.jsdelivr.net"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-white"
        >
          본문으로 건너뛰기
        </a>
        {children}
      </body>
    </html>
  );
}
