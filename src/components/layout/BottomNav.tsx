import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Map,
  Grid2x2,
  User,
  Plus,
  Users,
  MessagesSquare,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import { useChatUnreadOptional } from '../../context/ChatUnreadContext';

interface BottomNavProps {
  onCreatePost: () => void;
}

const LEFT_TABS: { to: string; icon: LucideIcon; label: string }[] = [
  { to: '/app/map', icon: Map, label: 'Map' },
  { to: '/app/feed', icon: Grid2x2, label: 'Feed' },
];

const PINK_ACTIVE = '#ff4f73';
const MUTED = '#9ca3af';

function socialSectionActive(pathname: string) {
  return pathname.startsWith('/app/community') || pathname.startsWith('/app/chat');
}

function TabLink(props: {
  to: string;
  icon: LucideIcon;
  label: string;
  pathname: string;
  unreadBadge?: string;
}) {
  const { to, icon: Icon, label, pathname, unreadBadge } = props;
  const active = pathname.startsWith(to);
  const showBadge = Boolean(unreadBadge && unreadBadge.length > 0);
  return (
    <NavLink
      to={to}
      aria-label={showBadge ? `${label}, ${unreadBadge} unread` : label}
      className={[
        'flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-2',
        'transition-all duration-200 motion-safe:active:scale-[0.96]',
        active ? 'bg-[#fff1f5] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]' : '',
      ].join(' ')}
      style={{ color: active ? PINK_ACTIVE : MUTED }}
    >
      <span className="relative inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center">
        <Icon className="h-[21px] w-[21px] shrink-0" strokeWidth={active ? 2.5 : 1.8} />
        {showBadge ? (
          <span className="pointer-events-none absolute -right-2 -top-0.5 flex min-h-[14px] min-w-[14px] items-center justify-center rounded-full border border-white bg-[#ff4f73] px-0.5 text-[8px] font-black tabular-nums leading-none text-white shadow-sm">
            {unreadBadge}
          </span>
        ) : null}
      </span>
      <span className="w-full truncate px-0.5 text-center text-[9px] font-bold">{label}</span>
    </NavLink>
  );
}

export function BottomNav({ onCreatePost }: BottomNavProps) {
  const { pathname } = useLocation();
  const chatUnread = useChatUnreadOptional();
  const dmBadge =
    chatUnread && chatUnread.chatUnreadTotal > 0
      ? chatUnread.chatUnreadTotal > 99
        ? '99+'
        : String(chatUnread.chatUnreadTotal)
      : undefined;

  const [socialOpen, setSocialOpen] = useState(false);
  const socialRootRef = useRef<HTMLDivElement>(null);

  const socialActive = socialSectionActive(pathname);

  useEffect(() => {
    if (!socialOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const root = socialRootRef.current;
      if (root?.contains(e.target as Node)) return;
      setSocialOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSocialOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [socialOpen]);

  useEffect(() => {
    setSocialOpen(false);
  }, [pathname]);

  return (
    <nav
      className="nommi-surface-glass relative z-30 overflow-visible border-t border-[#e5e7eb] shadow-[0_-8px_24px_rgba(47,95,196,0.08)]"
      style={{ paddingBottom: 'var(--nommi-bottom-nav-safe-padding)' }}
    >
      <div className="mx-auto flex min-h-[60px] w-full max-w-lg items-center gap-1 px-2 pt-1.5">
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-1">
          {LEFT_TABS.map(({ to, icon, label }) => (
            <TabLink key={to} to={to} icon={icon} label={label} pathname={pathname} />
          ))}
        </div>

        <div className="flex shrink-0 flex-col items-center justify-center px-0.5">
          <button
            type="button"
            onClick={onCreatePost}
            aria-label="Create post"
            className="relative z-40 flex h-[52px] w-[52px] items-center justify-center rounded-full border-[3px] border-white bg-linear-to-br from-[#ff4f73] to-[#ff7089] shadow-[0_8px_22px_rgba(255,79,115,0.42)] ring-1 ring-[#ff4f73]/20 motion-safe:transition-transform motion-safe:duration-200 motion-safe:hover:scale-[1.02] motion-safe:active:scale-95"
          >
            <Plus className="h-[22px] w-[22px] text-white" strokeWidth={2.8} />
          </button>
        </div>

        <div className="grid min-w-0 flex-1 grid-cols-2 gap-1">
          <div ref={socialRootRef} className="relative min-w-0">
            <button
              type="button"
              aria-label="Social menu"
              aria-expanded={socialOpen}
              aria-haspopup="menu"
              onClick={() => setSocialOpen((o) => !o)}
              className={[
                'flex w-full min-h-0 min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl py-2',
                'transition-all duration-200 motion-safe:active:scale-[0.96]',
                socialActive ? 'bg-[#fff1f5] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]' : '',
              ].join(' ')}
              style={{ color: socialActive ? PINK_ACTIVE : MUTED }}
            >
              <span className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center">
                <UsersRound
                  className="h-[21px] w-[21px] shrink-0"
                  strokeWidth={socialActive ? 2.5 : 1.8}
                />
              </span>
              <span className="w-full truncate px-0.5 text-center text-[9px] font-bold">Social</span>
            </button>

            {socialOpen ? (
              <div
                role="menu"
                aria-label="Social destinations"
                className={[
                  'nommi-fade-rise absolute bottom-full left-1/2 z-[60] mb-2 min-w-[10.75rem]',
                  '-translate-x-1/2 rounded-[20px]',
                  'border border-[#e8eaef]/95 bg-[rgba(255,255,255,0.9)] backdrop-blur-[14px]',
                  'px-1 py-1 shadow-[0_12px_40px_rgba(47,95,196,0.16),0_2px_8px_rgba(31,41,55,0.06)]',
                ].join(' ')}
              >
                <NavLink
                  to="/app/community"
                  role="menuitem"
                  onClick={() => setSocialOpen(false)}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-2.5 rounded-[14px] px-3 py-2 text-[13px] font-semibold transition-colors motion-safe:active:scale-[0.98]',
                      isActive
                        ? 'bg-[#fff1f5] text-[#ff4f73]'
                        : 'text-[#374151] hover:bg-[#f9fafb]',
                    ].join(' ')
                  }
                >
                  <Users className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
                  <span>Community</span>
                </NavLink>
                <NavLink
                  to="/app/chat"
                  role="menuitem"
                  onClick={() => setSocialOpen(false)}
                  aria-label={dmBadge ? `Chat, ${dmBadge} unread` : 'Chat'}
                  className={({ isActive }) =>
                    [
                      'flex items-center justify-between gap-2 rounded-[14px] px-3 py-2 text-[13px] font-semibold motion-safe:active:scale-[0.98]',
                      isActive
                        ? 'bg-[#fff1f5] text-[#ff4f73]'
                        : 'text-[#374151] transition-colors hover:bg-[#f9fafb]',
                    ].join(' ')
                  }
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <MessagesSquare className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
                    <span>Chat</span>
                  </span>
                  {dmBadge ? (
                    <span className="shrink-0 rounded-full border border-white/80 bg-[#ff4f73] px-1.5 py-0.5 text-[10px] font-black tabular-nums leading-none text-white shadow-sm">
                      {dmBadge}
                    </span>
                  ) : null}
                </NavLink>
              </div>
            ) : null}
          </div>

          <TabLink to="/app/profile" icon={User} label="Profile" pathname={pathname} />
        </div>
      </div>
    </nav>
  );
}
