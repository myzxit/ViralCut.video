import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { footerGroups, site } from '@/content/site';

export function SiteFooter() {
  return (
    <footer className="border-t border-black/[0.06] bg-canvas-soft">
      <div className="container-page py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-muted">
              긴 영상을 쇼츠로 자르고, 소리와 자막까지 새로 입혀 재구성하는
              도구입니다. 요금은 없습니다.
            </p>
          </div>

          {footerGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-semibold text-ink">{group.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-ink-muted transition hover:text-brand-700"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-black/[0.06] pt-8 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {site.name}. 결과물의 권리는
            이용자에게 있습니다.
          </p>
          <p>
            업로드하는 영상에 대한 권리는 직접 확보해 주세요.
          </p>
        </div>
      </div>
    </footer>
  );
}
