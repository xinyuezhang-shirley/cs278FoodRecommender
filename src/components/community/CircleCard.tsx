import { Users } from 'lucide-react';
import type { FoodCircle } from '../../types';

interface CircleCardProps {
  circle: FoodCircle;
  onOpen: () => void;
  onJoin?: () => void;
  variant: 'joined' | 'discover';
  loading?: boolean;
}

export function CircleCard({ circle, onOpen, onJoin, variant, loading }: CircleCardProps) {
  const isDiscover = variant === 'discover';

  return (
    <div className="flex items-stretch gap-2 px-4 py-3.5 bg-white rounded-[28px] border border-[#e5e7eb] shadow-[0_12px_32px_rgba(47,95,196,0.10)]">
      <button
        type="button"
        onClick={onOpen}
        className="flex items-center gap-3 flex-1 min-w-0 text-left rounded-2xl -m-1 p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5fc4]/25"
      >
        <div className="w-12 h-12 rounded-2xl bg-[#eaf1ff] border border-[#e5e7eb] flex items-center justify-center text-2xl flex-shrink-0 shadow-inner">
          {circle.icon_type}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-[#1a1a1a] truncate">{circle.name}</p>
          <p className="text-xs text-[#6b7280] line-clamp-2 mt-0.5 leading-snug">{circle.description}</p>
          {circle.tags && circle.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {circle.tags.slice(0, 4).map(t => (
                <span key={t} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f5f7ff] text-[#6b7280] border border-[#e5e7eb]">
                  {t}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1 mt-1.5 text-[11px] text-[#6f90d8] font-bold">
            <Users className="w-3 h-3 shrink-0" aria-hidden />
            {circle.member_count?.toLocaleString() ?? 0} members
          </div>
        </div>
      </button>

      {isDiscover ? (
        <button
          type="button"
          onClick={() => onJoin?.()}
          disabled={loading}
          className={[
            'self-center flex-shrink-0 px-4 py-2 rounded-full text-xs font-black transition-all border shadow-[0_6px_16px_rgba(47,95,196,0.15)] bg-linear-to-r from-[#2f5fc4] to-[#6f90d8] text-white border-transparent',
            loading ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-[1.03]',
          ].join(' ')}
        >
          Join
        </button>
      ) : (
        <button
          type="button"
          onClick={onOpen}
          className="self-center flex-shrink-0 px-4 py-2 rounded-full text-xs font-black bg-white text-[#2f5fc4] border border-[#e5e7eb] shadow-[0_6px_16px_rgba(47,95,196,0.1)] hover:bg-[#faf9f5]"
        >
          View
        </button>
      )}
    </div>
  );
}
