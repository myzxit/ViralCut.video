import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-50';

const variants: Record<Variant, string> = {
  primary:
    'bg-brand-gradient text-white shadow-lift hover:brightness-[1.06] active:brightness-95',
  secondary: 'bg-ink text-white hover:bg-ink-soft',
  outline:
    'border border-black/10 bg-white text-ink hover:border-brand-300 hover:text-brand-700',
  ghost: 'text-ink-soft hover:bg-canvas-sunk hover:text-ink',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-5 text-[0.95rem]',
  lg: 'h-14 px-7 text-base sm:h-[3.75rem] sm:px-9 sm:text-lg',
};

export function buttonClass(
  variant: Variant = 'primary',
  size: Size = 'md',
  className?: string,
) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ComponentProps<'button'> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}) {
  return (
    <button className={buttonClass(variant, size, className)} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}) {
  return (
    <Link className={buttonClass(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}
