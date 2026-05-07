import { useRef, useState, type TouchEvent } from 'react';
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { useAuth } from '../../context/AuthContext';
import { PageLoader } from '../ui/LoadingSpinner';
import { Modal } from '../ui/Modal';
import { CreatePostForm } from '../posts/CreatePostForm';
import { LogoPatternBackground } from '../ui/LogoPatternBackground';

export function AppLayout() {
  const { user, loading } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const lastSwipeAtRef = useRef(0);

  const TAB_ORDER = ['/app/map', '/app/feed', '/app/community', '/app/profile'] as const;

  function currentTabIndex(path: string): number {
    if (path.startsWith('/app/map')) return 0;
    if (path.startsWith('/app/feed')) return 1;
    if (path.startsWith('/app/community')) return 2;
    if (path.startsWith('/app/profile')) return 3;
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
    <div
      className="nommi-app-shell relative isolate bg-[#faf9f5] max-w-lg mx-auto w-full flex flex-col overflow-x-hidden overflow-y-visible"
      style={{ height: '100dvh' }}
    >
      <LogoPatternBackground />
      <main className="relative z-[1] flex-1 min-h-0 overflow-y-auto" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div key={pathname} className="nommi-route-enter min-h-full">
          <Outlet />
        </div>
      </main>

      <div className="relative z-[2]">
        <BottomNav onCreatePost={() => setShowCreate(true)} />
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} fullScreen>
        <CreatePostForm
          onSuccess={() => setShowCreate(false)}
          onCancel={() => setShowCreate(false)}
        />
      </Modal>
    </div>
  );
}
