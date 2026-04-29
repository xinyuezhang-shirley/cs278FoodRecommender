import { Users } from 'lucide-react';
import type { FoodCircle } from '../../types';

interface CircleCardProps {
  circle: FoodCircle;
  onJoin: () => void;
  onLeave: () => void;
  onClick: () => void;
  loading?: boolean;
}

export function CircleCard({ circle, onJoin, onLeave, onClick, loading }: CircleCardProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-[#f3f4f6]">
      <button
        onClick={onClick}
        className="flex items-center gap-3 flex-1 min-w-0 text-left"
      >
        <div className="w-11 h-11 rounded-xl bg-[#f3f4f6] flex items-center justify-center text-2xl flex-shrink-0">
          {circle.icon_type}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#1a1a1a] truncate">{circle.name}</p>
          <p className="text-xs text-[#6b7280] line-clamp-1 mt-0.5">{circle.description}</p>
          <div className="flex items-center gap-1 mt-1 text-[11px] text-[#9ca3af]">
            <Users className="w-3 h-3" />
            {circle.member_count?.toLocaleString() ?? 0} members
          </div>
        </div>
      </button>

      <button
        onClick={e => { e.stopPropagation(); circle.is_member ? onLeave() : onJoin(); }}
        disabled={loading}
        className={[
          'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors',
          circle.is_member
            ? 'bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb]'
            : 'bg-[#1a1a1a] text-white hover:bg-[#374151]',
          loading ? 'opacity-50 cursor-not-allowed' : '',
        ].join(' ')}
      >
        {circle.is_member ? 'Joined' : 'Join'}
      </button>
    </div>
  );
}
