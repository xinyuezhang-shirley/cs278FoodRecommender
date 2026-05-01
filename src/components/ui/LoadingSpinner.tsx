import loadingFoodAwaiting from '../../assets/nommi/loading_food_awaiting.png';

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
}

export function PageLoader({ compact = false }: PageLoaderProps) {
  return (
    <div
      className={
        compact
          ? 'flex items-center justify-center py-8'
          : 'flex items-center justify-center min-h-[12rem]'
      }
    >
      <img
        src={loadingFoodAwaiting}
        alt="Nommi loading illustration"
        className={
          compact
            ? 'w-28 max-w-[7rem] h-auto object-contain mx-auto'
            : 'w-36 sm:w-40 max-w-[10rem] h-auto object-contain mx-auto'
        }
        decoding="async"
      />
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
