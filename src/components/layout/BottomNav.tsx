import { NavLink, useLocation } from 'react-router-dom';
import { Map, Grid2x2, Users, User, Plus } from 'lucide-react';

interface BottomNavProps {
  onCreatePost: () => void;
}

const LEFT_TABS = [
  { to: '/app/map', icon: Map, label: 'Map' },
  { to: '/app/feed', icon: Grid2x2, label: 'Feed' },
];

const RIGHT_TABS = [
  { to: '/app/community', icon: Users, label: 'Community' },
  { to: '/app/profile', icon: User, label: 'Profile' },
];

export function BottomNav({ onCreatePost }: BottomNavProps) {
  const { pathname } = useLocation();

  return (
    <nav
      className="bg-white/90 backdrop-blur-md border-t border-[#e5e7eb] relative z-30"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 4px)' }}
    >
      <div className="flex items-end h-[60px]">
        {LEFT_TABS.map(({ to, icon: Icon, label }) => {
          const active = pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors"
              style={{ color: active ? '#f43f5e' : '#9ca3af' }}
            >
              <Icon className="w-[22px] h-[22px]" strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium">{label}</span>
            </NavLink>
          );
        })}

        {/* Centre create button */}
        <div className="relative w-20 flex justify-center items-end pb-2 flex-shrink-0">
          <button
            onClick={onCreatePost}
            aria-label="Create post"
            className="absolute -top-5 w-[52px] h-[52px] rounded-full flex items-center justify-center transition-transform active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #f43f5e 0%, #fb7185 100%)',
              boxShadow: '0 4px 18px rgba(244,63,94,0.38), 0 1px 4px rgba(244,63,94,0.22)',
            }}
          >
            <Plus className="w-[22px] h-[22px] text-white" strokeWidth={2.8} />
          </button>
        </div>

        {RIGHT_TABS.map(({ to, icon: Icon, label }) => {
          const active = pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors"
              style={{ color: active ? '#f43f5e' : '#9ca3af' }}
            >
              <Icon className="w-[22px] h-[22px]" strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium">{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
