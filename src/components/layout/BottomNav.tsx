import { NavLink, useLocation } from 'react-router-dom';
import { Map, Grid2x2, Users, User, Plus, type LucideIcon } from 'lucide-react';

interface BottomNavProps {
  onCreatePost: () => void;
}

const LEFT_TABS: { to: string; icon: LucideIcon; label: string }[] = [
  { to: '/app/map', icon: Map, label: 'Map' },
  { to: '/app/feed', icon: Grid2x2, label: 'Feed' },
];

const RIGHT_TABS: { to: string; icon: LucideIcon; label: string }[] = [
  { to: '/app/community', icon: Users, label: 'Community' },
  { to: '/app/profile', icon: User, label: 'Profile' },
];

const PINK_ACTIVE = '#ff4f73';
const MUTED = '#9ca3af';

function TabLink(props: {
  to: string;
  icon: LucideIcon;
  label: string;
  pathname: string;
}) {
  const { to, icon: Icon, label, pathname } = props;
  const active = pathname.startsWith(to);
  return (
    <NavLink
      to={to}
      className={[
        'flex flex-1 min-w-0 flex-col items-center justify-end gap-0.5 py-1.5 rounded-2xl',
        'transition-all duration-200 motion-safe:active:scale-[0.96]',
        active ? 'bg-[#fff1f5] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]' : '',
      ].join(' ')}
      style={{ color: active ? PINK_ACTIVE : MUTED }}
    >
      <Icon className="w-[21px] h-[21px] shrink-0" strokeWidth={active ? 2.5 : 1.8} />
      <span className="text-[9px] font-bold truncate w-full text-center px-0.5">{label}</span>
    </NavLink>
  );
}

export function BottomNav({ onCreatePost }: BottomNavProps) {
  const { pathname } = useLocation();

  return (
    <nav
      className="nommi-surface-glass border-t border-[#e5e7eb] relative z-30 shadow-[0_-8px_24px_rgba(47,95,196,0.08)]"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-end w-full max-w-lg mx-auto min-h-[56px] pt-1 px-2 gap-2">
        <div className="flex justify-stretch items-end min-w-0">
          <div className="grid grid-cols-2 w-full gap-1">
            {LEFT_TABS.map(({ to, icon, label }) => (
              <TabLink key={to} to={to} icon={icon} label={label} pathname={pathname} />
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center justify-end pb-0.5 w-[4.75rem] shrink-0 mx-auto">
          <button
            type="button"
            onClick={onCreatePost}
            aria-label="Create post"
            className="relative z-40 -mt-[22px] w-14 h-14 rounded-full flex items-center justify-center motion-safe:transition-transform motion-safe:duration-200 motion-safe:active:scale-95 motion-safe:hover:scale-[1.03] bg-linear-to-br from-[#ff4f73] to-[#ff7089] shadow-[0_10px_28px_rgba(255,79,115,0.48)] border-[3px] border-white ring-1 ring-[#ff4f73]/20 nommi-float-soft"
          >
            <Plus className="w-[23px] h-[23px] text-white" strokeWidth={2.8} />
          </button>
        </div>

        <div className="flex justify-stretch items-end min-w-0">
          <div className="grid grid-cols-2 w-full gap-1">
            {RIGHT_TABS.map(({ to, icon, label }) => (
              <TabLink key={to} to={to} icon={icon} label={label} pathname={pathname} />
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
