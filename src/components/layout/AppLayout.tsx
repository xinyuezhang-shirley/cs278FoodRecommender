import { useRef, useState, useEffect, type TouchEvent } from 'react';
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { useAuth } from '../../context/AuthContext';
import { PageLoader } from '../ui/LoadingSpinner';
import { Modal } from '../ui/Modal';
import { CreatePostForm } from '../posts/CreatePostForm';
import { LogoPatternBackground } from '../ui/LogoPatternBackground';
import { NommiFilterProvider } from '../../context/NommiFilterProvider';
import { ChatUnreadProvider } from '../../context/ChatUnreadContext';
import { PostNotificationsProvider } from '../../context/PostNotificationsContext';

export function AppLayout() {
  const { user, loading } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const lastSwipeAtRef = useRef(0);

  /** Must run every render — keep above any conditional returns (Rules of Hooks). */
  useEffect(() => {
    const openCreate = () => setShowCreate(true);
    window.addEventListener('nommi-open-create-post', openCreate);
    return () => window.removeEventListener('nommi-open-create-post', openCreate);
  }, []);

  const TAB_ORDER = ['/app/map', '/app/feed', '/app/community', '/app/chat', '/app/profile'] as const;

  function currentTabIndex(path: string): number {
    if (path.startsWith('/app/map')) return 0;
    if (path.startsWith('/app/feed')) return 1;
    if (path.startsWith('/app/community')) return 2;
    if (path.startsWith('/app/chat')) return 3;
    if (path.startsWith('/app/profile')) return 4;
    return -1;
  }

  function isInteractiveTarget(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null;
    if (!el) return false;
    return Boolean(el.closest('input, textarea, button, a, select, [role="button"], [data-no-swipe]'));
  }

  function onTouchStart(e: TouchEvent<HTMLElement>) {
    if (e.touches.length !== 1) return;
    if (isInteractiveTarget(e.target)) return;
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  }

  function onTouchEnd(e: TouchEvent<HTMLElement>) {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    if (isInteractiveTarget(e.target)) return;
    if (Date.now() - lastSwipeAtRef.current < 280) return;
    const tabIdx = currentTabIndex(pathname);
    if (tabIdx < 0) return;

    const end = e.changedTouches[0];
    const dx = end.clientX - start.x;
    const dy = end.clientY - start.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (absX < 72 || absX < absY * 1.25) return;

    // Left swipe -> next tab, right swipe -> previous tab.
    const next = dx < 0 ? (tabIdx + 1) % TAB_ORDER.length : (tabIdx - 1 + TAB_ORDER.length) % TAB_ORDER.length;
    lastSwipeAtRef.current = Date.now();
    navigate(TAB_ORDER[next]);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-dvh bg-[#faf9f5]">
        <PageLoader />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <ChatUnreadProvider userId={user.id}>
      <PostNotificationsProvider userId={user.id}>
        <div
          className="nommi-app-shell relative isolate mx-auto flex w-full max-w-lg min-h-dvh flex-col overflow-x-hidden bg-[#faf9f5]"
        >
          <LogoPatternBackground />
          <main
            className="relative z-[1] flex w-full min-w-0 grow flex-col"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <NommiFilterProvider>
              <div
                key={pathname}
                className="nommi-route-enter flex w-full flex-col"
              >
                <Outlet />
              </div>
            </NommiFilterProvider>
          </main>

          <div className="fixed bottom-0 left-1/2 z-[50] w-full max-w-lg -translate-x-1/2">
            <BottomNav onCreatePost={() => setShowCreate(true)} />
          </div>

          <Modal open={showCreate} onClose={() => setShowCreate(false)} fullScreen>
            <CreatePostForm
              onSuccess={() => setShowCreate(false)}
              onCancel={() => setShowCreate(false)}
            />
          </Modal>
        </div>
      </PostNotificationsProvider>
    </ChatUnreadProvider>
  );
}
