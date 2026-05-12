import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Clock, GripHorizontal, MapPin, X } from 'lucide-react';
import type { Post } from '../../types';
import type { PlaceGroup } from '../../utils/groupPostsByLocation';
import { timeRemaining, isExpired } from '../../utils/helpers';
import { getPostAuthorDisplay } from '../../utils/postAuthorPresentation';
import { PostTypeBadge } from '../ui/Tag';

/**
 * Padding inside the sheet so scrolled content clears the overlapped tab-bar / FAB zone.
 * One compact token — avoids docking the whole panel mid-screen (no “floating” gap).
 */
const SHEET_CONTENT_BOTTOM_PAD =
  'pb-[max(1.25rem,calc(env(safe-area-inset-bottom,0px)+4.125rem))]';

type SnapTier = 'peek' | 'expanded' | 'full';

/** Match legacy BottomSheet feel: modest max-heights anchored to bottom; small bump (~1dvh) vs 85 baseline. */
const SNAP_HEIGHT: Record<SnapTier, string> = {
  peek:
    'min-h-[11.5rem] max-h-[min(36dvh,320px)] h-[clamp(216px,min(34dvh,300px),320px)]',
  expanded: 'max-h-[min(86dvh,660px)]',
  full: 'max-h-[min(92dvh,760px)]',
};

const SNAP_ORDER: SnapTier[] = ['peek', 'expanded', 'full'];

interface MapPinExploreSheetProps {
  group: PlaceGroup | null;
  onClose: () => void;
  onOpenPostDetail: (post: Post) => void;
}

const PREVIEW_COUNT = 3;

function derivePlaceChips(posts: Post[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  const push = (label: string) => {
    const k = label.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push(label);
  };

  if (posts.some(p => p.type === 'free_food' || p.is_free_food)) push('Free food');

  for (const p of posts) {
    for (const raw of p.cuisine_tags) {
      const t = raw.trim();
      if (!t) continue;
      const l = t.toLowerCase();
      if (l.includes('boba') || l.includes('bubble')) push('Boba');
      else if (l.includes('coffee') || l.includes('espresso')) push('Coffee');
      else push(t);
    }
    for (const raw of p.dietary_tags) {
      const t = raw.trim();
      if (t) push(t);
    }
  }

  return out.slice(0, 6);
}

/** Map place preview — BottomSheet-aligned: docked to bottom, blurred backdrop, slide-up + snap drag. */
export function MapPinExploreSheet({ group, onClose, onOpenPostDetail }: MapPinExploreSheetProps) {
  const [snap, setSnap] = useState<SnapTier>('expanded');
  const [dragPx, setDragPx] = useState(0);
  const [isGesturing, setIsGesturing] = useState(false);
  const [sheetEntered, setSheetEntered] = useState(false);
  const gesturingRef = useRef(false);
  const startY = useRef(0);
  const reducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const suppressHeightTransition = isGesturing || dragPx !== 0;
  const heightTransitionClass = suppressHeightTransition
    ? ''
    : reducedMotion
      ? 'transition-[height,min-height,max-height] duration-150 ease-out'
      : 'transition-[height,min-height,max-height] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]';

  const slideDurationClass = reducedMotion ? 'duration-0' : 'duration-[520ms] ease-[cubic-bezier(0.22,1,0.36,1)]';

  useEffect(() => {
    if (!group) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [group]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (group) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [group, onClose]);

  useEffect(() => {
    setSnap('expanded');
    setDragPx(0);
    setIsGesturing(false);
    gesturingRef.current = false;
    startY.current = 0;

    setSheetEntered(false);
    if (!group) return;
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setSheetEntered(true));
    });
    return () => window.cancelAnimationFrame(id);
  }, [group?.id]);

  const posts = useMemo(
    () =>
      group
        ? [...group.posts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        : [],
    [group],
  );

  const chips = useMemo(() => (group ? derivePlaceChips(group.posts) : []), [group]);

  const previewPosts = snap === 'peek' ? posts.slice(0, 1) : snap === 'expanded' ? posts.slice(0, PREVIEW_COUNT) : posts;

  const bumpSnap = useCallback((dir: 1 | -1) => {
    setSnap(prev => {
      const i = SNAP_ORDER.indexOf(prev);
      const next = i + dir;
      if (next < 0) return SNAP_ORDER[0];
      if (next >= SNAP_ORDER.length) return SNAP_ORDER[SNAP_ORDER.length - 1];
      return SNAP_ORDER[next]!;
    });
  }, []);

  const onDragStart = (clientY: number) => {
    gesturingRef.current = true;
    setIsGesturing(true);
    startY.current = clientY;
    setDragPx(0);
  };

  const onDragMove = useCallback((clientY: number) => {
    if (!gesturingRef.current) return;
    const dy = clientY - startY.current;
    setDragPx(Math.max(-140, Math.min(160, dy)));
  }, []);

  const endDrag = useCallback(
    (clientY: number) => {
      if (!gesturingRef.current) return;
      gesturingRef.current = false;
      setIsGesturing(false);
      const dy = clientY - startY.current;
      setDragPx(0);

      const THRESH = reducedMotion ? 40 : 56;
      if (dy > THRESH) bumpSnap(-1);
      else if (dy < -THRESH) bumpSnap(1);
      startY.current = 0;
    },
    [bumpSnap, reducedMotion],
  );

  const sheetPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    onDragStart(e.clientY);
  }, []);

  const sheetPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      onDragMove(e.clientY);
    },
    [onDragMove],
  );

  const sheetPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      try {
        e.currentTarget.releasePointerCapture?.(e.pointerId);
      } catch {
        //
      }
      endDrag(e.clientY);
    },
    [endDrag],
  );

  if (!group) return null;

  const sheetBody = (
    <div className="fixed inset-0 z-[9998] flex items-end justify-center">
      {/* Same tonal blur + dim as shared BottomSheet */}
      <div
        className={[
          'absolute inset-0 bg-[#2f5fc4]/20 backdrop-blur-[2px] motion-safe:transition-opacity motion-safe:duration-300 motion-safe:ease-out',
          sheetEntered ? 'opacity-100 cursor-default' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        onClick={sheetEntered ? onClose : undefined}
        aria-hidden
      />

      {/* Shell: slides up from bottom (maps-style grounding) */}
      <div
        className={[
          'relative w-full max-w-lg mx-auto flex justify-center motion-safe:transition-transform',
          slideDurationClass,
          sheetEntered ? 'translate-y-0' : 'translate-y-full',
        ].join(' ')}
      >
        <div
          className={[
            /* Panel: overlaps nav chrome visually; grounded with top-only border like BottomSheet */
            'relative w-full flex flex-col min-h-0 rounded-t-[28px]',
            'bg-[#faf9f5]/[0.97] backdrop-blur-sm shadow-[0_-12px_40px_rgba(47,95,196,0.18)] border-t border-x border-[#e5e7eb]/85',
            SNAP_HEIGHT[snap],
            snap === 'expanded' || snap === 'full' ? 'min-h-[14rem]' : '',
            heightTransitionClass,
          ].join(' ')}
          role="dialog"
          aria-modal="true"
          aria-label={`Posts at ${group.locationName}`}
          style={{
            transform: dragPx !== 0 ? `translateY(${Math.max(-20, dragPx)}px)` : undefined,
          }}
        >
          <div
            className="shrink-0 flex flex-col items-center gap-2 pt-3 pb-2 px-4 cursor-grab active:cursor-grabbing touch-none select-none border-b border-[#e5e7eb]/50"
            style={{ touchAction: 'none' }}
            data-no-swipe
            onPointerDown={sheetPointerDown}
            onPointerMove={sheetPointerMove}
            onPointerUp={sheetPointerUp}
            onPointerCancel={sheetPointerUp}
          >
            <div className="flex justify-center w-full pb-0.5">
              <div className="w-10 h-1 rounded-full bg-[#eaf1ff] border border-[#e5e7eb]/60 shadow-inner" aria-hidden />
            </div>
            <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[#9ca3af]">
              <GripHorizontal className="w-3.5 h-3.5 text-[#6f90d8]" aria-hidden />
              <span>
                {snap === 'full' ? 'Drag down for less' : snap === 'peek' ? 'Drag up for more' : 'Drag up or down'}
              </span>
            </div>
            <SnapDots snap={snap} onPick={setSnap} />
          </div>

          <div className="flex items-start justify-between gap-3 px-4 pb-3 shrink-0 pt-2">
            <div className="min-w-0 flex-1">
              <h3 className="text-xl font-black text-[#2f5fc4] leading-snug break-words pr-2">{group.locationName}</h3>
              <p className="text-[11px] font-bold text-[#6f90d8] mt-1.5 tracking-tight">
                {posts.length} post{posts.length !== 1 ? 's' : ''} · tap a card to open
              </p>
              {chips.length > 0 && (
                <div
                  className="flex gap-2 mt-3 pb-1 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  style={{ touchAction: 'pan-x pinch-zoom' }}
                >
                  {chips.map(c => (
                    <span
                      key={c}
                      className="shrink-0 text-[10px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full bg-[#eaf1ff] text-[#2f5fc4] border border-[#dfe8fb]"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              data-no-swipe
              className="shrink-0 w-10 h-10 rounded-full bg-white/90 border border-[#e5e7eb] flex items-center justify-center text-[#6b7280] hover:bg-[#faf9f5] shadow-sm backdrop-blur-sm"
              aria-label="Close"
            >
              <X className="w-5 h-5" strokeWidth={2.25} />
            </button>
          </div>

          <div
            className={[
              'flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pt-2 space-y-3.5 [scrollbar-gutter:stable]',
              SHEET_CONTENT_BOTTOM_PAD,
            ].join(' ')}
            data-no-swipe
          >
            {previewPosts.map(post => (
              <PostPreviewCard
                key={post.id}
                post={post}
                onOpen={() => {
                  onOpenPostDetail(post);
                  onClose();
                }}
                compactThumb={snap === 'peek'}
              />
            ))}
          </div>

          {posts.length > (snap === 'peek' ? 1 : PREVIEW_COUNT) && (
            <button
              type="button"
              data-no-swipe
              onClick={() => setSnap(prev => (prev === 'full' ? 'expanded' : 'full'))}
              className={`mx-4 mt-1 mb-[max(0.75rem,env(safe-area-inset-bottom,0px))] w-[calc(100%-2rem)] flex items-center justify-center gap-1.5 py-3 rounded-full border-2 border-[#2f5fc4]/90 text-[#2f5fc4] text-sm font-black bg-white/85 hover:bg-[#eaf1ff]/75 transition-colors shrink-0 shadow-[0_4px_16px_rgba(47,95,196,0.1)] backdrop-blur-sm`}
            >
              {snap === 'full' ? `Show fewer` : `See all ${posts.length} posts`}
              <ChevronDown className={`w-4 h-4 transition-transform ${snap === 'full' ? 'rotate-180' : ''}`} aria-hidden />
            </button>
          )}

          {posts.length <= (snap === 'peek' ? 1 : PREVIEW_COUNT) && (
            <div className="shrink-0 h-[max(0.5rem,env(safe-area-inset-bottom,0px))]" />
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(sheetBody, document.body) : null;
}

function SnapDots(props: {
  snap: SnapTier;
  onPick: (t: SnapTier) => void;
}) {
  const { snap, onPick } = props;
  return (
    <div className="flex gap-3 items-center" role="tablist" aria-label="Sheet size">
      {SNAP_ORDER.map(tier => (
        <button
          key={tier}
          type="button"
          role="tab"
          aria-selected={snap === tier}
          onClick={e => {
            e.stopPropagation();
            onPick(tier);
          }}
          data-no-swipe
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-transform motion-safe:active:scale-[0.97]"
          title={tier === 'peek' ? 'Compact' : tier === 'expanded' ? 'Default' : 'Expanded'}
        >
          <span
            className={[
              'block rounded-full transition-all',
              snap === tier
                ? 'w-10 h-2.5 bg-[#2f5fc4] shadow-[0_4px_12px_rgba(47,95,196,0.25)]'
                : 'w-2.5 h-2.5 bg-[#d1d5db] hover:bg-[#93c5fd]',
            ].join(' ')}
            aria-hidden
          />
          <span className="sr-only">
            {tier === 'peek' ? 'Compact height' : tier === 'expanded' ? 'Default height' : 'Maximum height'}
          </span>
        </button>
      ))}
    </div>
  );
}

function PostPreviewCard({
  post,
  onOpen,
  compactThumb,
}: {
  post: Post;
  onOpen: () => void;
  compactThumb?: boolean;
}) {
  const expired = isExpired(post.expires_at);
  const remaining = post.expires_at && !expired ? timeRemaining(post.expires_at) : null;
  const authorLabel = getPostAuthorDisplay(post).handleLine;
  const thumbClass = compactThumb ? 'w-20 min-h-[5rem]' : 'w-[100px] min-h-[5.75rem] sm:w-[112px]';

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left rounded-[22px] border border-[#e5e7eb] bg-white/95 overflow-hidden shadow-[0_6px_20px_rgba(47,95,196,0.08)] hover:border-[#2f5fc4]/35 transition-all active:scale-[0.99] flex gap-0 backdrop-blur-sm"
    >
      {post.image_url && (
        <div className={`${thumbClass} shrink-0 bg-[#eaf1ff]`}>
          <img
            src={post.image_url}
            alt=""
            className="w-full h-full min-h-[5rem] object-cover"
            loading="lazy"
            onError={e => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}
      <div className="flex-1 min-w-0 px-4 py-3.5 flex flex-col justify-center gap-1">
        <div className="flex items-center gap-1.5">
          <PostTypeBadge type={post.type} />
        </div>
        <p className="text-sm font-black text-[#1a1a1a] leading-snug line-clamp-3">{post.title}</p>
        <p className="text-[11px] font-bold text-[#6b7280]">{authorLabel}</p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[11px] text-[#6b7280]">
          <span className="inline-flex items-center gap-1 truncate max-w-full">
            <MapPin className="w-3 h-3 flex-shrink-0 text-[#6f90d8]" aria-hidden />
            <span className="truncate">{post.location_name?.trim() || 'Here'}</span>
          </span>
          {remaining && (
            <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
              <Clock className="w-3 h-3" aria-hidden />
              {remaining}
            </span>
          )}
          {expired && post.expires_at && <span className="text-[#9ca3af] font-semibold">Ended</span>}
        </div>
      </div>
    </button>
  );
}
