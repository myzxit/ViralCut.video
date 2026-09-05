import { cn } from '@/lib/utils';

/**
 * ViralCut mark: a play triangle sliced by a diagonal gap, with the lower half
 * kicked out of alignment — "the cut" made literal. Drawn from scratch as SVG so
 * it stays crisp at favicon size and inherits the brand gradient.
 */
export function LogoMark({
  className,
  id = 'vc-mark',
}: {
  className?: string;
  id?: string;
}) {
  return (
    <svg
      viewBox="0 0 40 40"
      role="img"
      aria-label="ViralCut"
      className={cn('h-9 w-9', className)}
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5b3df5" />
          <stop offset="55%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#ff4d6d" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill={`url(#${id}-bg)`} />
      {/* Upper half of the play head */}
      <path d="M14.5 10.5 27.5 18.2 14.5 18.2Z" fill="#fff" />
      {/* Lower half, offset right to read as a slice */}
      <path d="M17 21.8 30 21.8 17 29.5Z" fill="#fff" fillOpacity="0.92" />
    </svg>
  );
}

export function LogoWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'text-[1.35rem] font-extrabold leading-none tracking-[-0.03em] text-ink',
        className,
      )}
    >
      Viral<span className="text-brand-600">Cut</span>
    </span>
  );
}

export function Logo({
  className,
  markClassName,
  id,
}: {
  className?: string;
  markClassName?: string;
  id?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className={markClassName} id={id} />
      <LogoWordmark />
    </span>
  );
}
