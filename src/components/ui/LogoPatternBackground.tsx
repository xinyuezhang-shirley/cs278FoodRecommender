interface LogoPatternBackgroundProps {
  className?: string;
}

/** Decorative tilted logo checker for non-home pages. */
export function LogoPatternBackground({ className = '' }: LogoPatternBackgroundProps) {
  return (
    <div
      className={[
        'pointer-events-none fixed inset-0 overflow-hidden',
        className,
      ].join(' ')}
      aria-hidden
    >
      <div className="nommi-pattern-image absolute inset-[-18%] bg-[url('/graphics/nommi-bg-pattern.png')] bg-repeat bg-[length:380px_auto] opacity-[0.18]" />
      <div className="nommi-pattern-scrim absolute inset-0" />
      <div className="absolute inset-0 bg-radial-[ellipse_at_top_right] from-white/55 via-white/15 to-transparent" />
    </div>
  );
}
