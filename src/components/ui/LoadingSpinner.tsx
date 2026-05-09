interface SpinnerProps { size?: 'sm' | 'md' | 'lg'; className?: string; }

const SIZE_CLASSES = { sm: 'w-4 h-4 border-2', md: 'w-6 h-6 border-2', lg: 'w-8 h-8 border-2' };

export function LoadingSpinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <span
      className={[
        SIZE_CLASSES[size],
        'rounded-full border-[#e5e7eb] border-t-[#2f5fc4] animate-spin inline-block',
        className,
      ].join(' ')}
    />
  );
}

interface PageLoaderProps {
  /** Tighter illustration for nested areas (e.g. comments loading). */
  compact?: boolean;
  label?: string;
}

export function PageLoader({ compact = false, label = 'Finding better flavors for you…' }: PageLoaderProps) {
  const loadingSrc = '/graphics/nommi-loading-dark.png';
  return (
    <div
      className={
        compact
          ? 'flex flex-col items-center justify-center py-8'
          : 'flex flex-col items-center justify-center min-h-[12rem]'
      }
    >
      <img
        src={loadingSrc}
        alt="Nommi loading illustration"
        className={
          compact
            ? 'w-28 max-w-[7rem] h-auto object-contain mx-auto nommi-float-soft'
            : 'w-44 sm:w-52 max-w-[13rem] h-auto object-contain mx-auto nommi-float'
        }
        decoding="async"
      />
      {!compact && (
        <p className="mt-3 text-xs font-bold text-[#6f90d8] tracking-wide">{label}</p>
      )}
    </div>
  );
}

interface FailStateArtProps {
  compact?: boolean;
  title?: string;
}

export function FailStateArt({ compact = false, title = 'No post found… try another filter' }: FailStateArtProps) {
  return (
    <div className={compact ? 'flex flex-col items-center py-2' : 'flex flex-col items-center py-4'}>
      <img
        src="/graphics/nommi-empty-filter.png"
        alt="Nommi empty state illustration"
        className={compact ? 'w-40 max-w-[11rem] h-auto object-contain nommi-wobble' : 'w-56 max-w-[15rem] h-auto object-contain nommi-wobble'}
        decoding="async"
      />
      <div className="mt-2 w-9 h-9 rounded-full bg-white border border-[#d7e3fb] flex items-center justify-center shadow-[0_8px_16px_rgba(47,95,196,0.16)]">
        <span className="w-3 h-3 rounded-full bg-[#2f5fc4] nommi-pulse-dot" />
      </div>
      {!compact && <p className="mt-2 text-xs font-black tracking-wide text-[#2f5fc4] uppercase">{title}</p>}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-[28px] overflow-hidden animate-pulse border border-[#e5e7eb] shadow-[0_10px_25px_rgba(47,95,196,0.08)]">
      <div className="bg-[#eaf1ff]/60" style={{ height: `${120 + Math.random() * 80}px` }} />
      <div className="p-4 space-y-2">
        <div className="h-3 bg-[#f5f3ef] rounded-full w-1/3" />
        <div className="h-3 bg-[#f5f3ef] rounded-full w-full" />
        <div className="h-3 bg-[#f5f3ef] rounded-full w-3/4" />
        <div className="flex gap-2 mt-1">
          <div className="h-2.5 bg-[#f5f3ef] rounded-full w-8" />
          <div className="h-2.5 bg-[#f5f3ef] rounded-full w-8" />
        </div>
      </div>
    </div>
  );
}
