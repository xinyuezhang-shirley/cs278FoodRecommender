interface SpinnerProps { size?: 'sm' | 'md' | 'lg'; className?: string; }

const SIZE_CLASSES = { sm: 'w-4 h-4 border-2', md: 'w-6 h-6 border-2', lg: 'w-8 h-8 border-2' };

export function LoadingSpinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <span
      className={[
        SIZE_CLASSES[size],
        'rounded-full border-[#e5e7eb] border-t-[#f43f5e] animate-spin inline-block',
        className,
      ].join(' ')}
    />
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-48">
      <LoadingSpinner size="lg" />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl overflow-hidden animate-pulse">
      <div className="bg-[#f3f4f6]" style={{ height: `${120 + Math.random() * 80}px` }} />
      <div className="p-2 space-y-2">
        <div className="h-3 bg-[#f3f4f6] rounded w-1/3" />
        <div className="h-3 bg-[#f3f4f6] rounded w-full" />
        <div className="h-3 bg-[#f3f4f6] rounded w-3/4" />
        <div className="flex gap-2 mt-1">
          <div className="h-2.5 bg-[#f3f4f6] rounded w-8" />
          <div className="h-2.5 bg-[#f3f4f6] rounded w-8" />
        </div>
      </div>
    </div>
  );
}
