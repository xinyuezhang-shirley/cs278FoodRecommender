interface LogoPatternBackgroundProps {
  className?: string;
}

/** Decorative tilted logo checker for non-home pages. */
export function LogoPatternBackground({ className = '' }: LogoPatternBackgroundProps) {
  return (
    <div
      className={[
        'pointer-events-none absolute inset-0 overflow-hidden opacity-[0.06]',
        className,
      ].join(' ')}
      aria-hidden
    >
      <div className="nommi-tilted-grid absolute -inset-24" />
    </div>
  );
}
