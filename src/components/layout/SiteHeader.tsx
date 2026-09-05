'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { ButtonLink } from '@/components/ui/Button';
import { nav } from '@/content/site';
import { cn } from '@/lib/utils';

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // A fixed header over a locked body would otherwise let the page scroll behind the menu.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b transition',
        scrolled
          ? 'border-black/[0.06] bg-white/85 backdrop-blur-xl'
          : 'border-transparent bg-white/0',
      )}
    >
      <div className="container-page flex h-[4.5rem] items-center justify-between">
        <Link href="/" aria-label="ViralCut 홈" className="shrink-0">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2 text-[0.95rem] font-medium text-ink-soft transition hover:bg-canvas-sunk hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ButtonLink href="/login" variant="ghost" size="sm">
            로그인
          </ButtonLink>
          <ButtonLink href="/app/new" size="sm">
            무료로 시작
          </ButtonLink>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? '메뉴 닫기' : '메뉴 열기'}
          aria-expanded={open}
          className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-soft transition hover:bg-canvas-sunk md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-black/[0.06] bg-white md:hidden">
          <div className="container-page flex flex-col gap-1 py-4">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-2xl px-4 py-3 text-base font-medium text-ink-soft transition hover:bg-canvas-sunk"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-3 flex flex-col gap-2">
              <ButtonLink
                href="/login"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                로그인
              </ButtonLink>
              <ButtonLink href="/app/new" onClick={() => setOpen(false)}>
                무료로 시작
              </ButtonLink>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
