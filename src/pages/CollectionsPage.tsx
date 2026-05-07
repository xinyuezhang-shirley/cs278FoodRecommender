import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import type { Post, ReactionType } from '../types';
import { useAuth } from '../context/AuthContext';
import { reactToPost } from '../services/postService';
import { getPostIntentsForUser, loadUserPostCollections, togglePostIntent } from '../services/interactionService';
import type { UserPostCollections } from '../services/interactionService';
import { COLLECTION_SECTIONS } from '../components/profile/ProfileCollectionsPanel';
import { PostGrid } from '../components/posts/PostGrid';
import { ShareToCircleModal } from '../components/community/ShareToCircleModal';
import { collectionsTabFromParam, pathForCollectionsTab } from '../utils/collectionRoutes';
import emptyNoPostsYetSimple from '../assets/nommi/empty_no_posts_yet_simple.png';
import { openAppPostInNewTab } from '../utils/helpers';
import { useDebouncedRealtime } from '../hooks/useDebouncedRealtime';

const KNOWN_COLLECTION_SEGMENTS = new Set([
  'saved',
  'liked',
  'been-there',
  'want-to-go',
  'favorite',
]);

const EMPTY: UserPostCollections = {
  saved: [],
  liked: [],
  been_there: [],
  want_to_go: [],
  favorite: [],
};

export function CollectionsPage() {
  const { tabKey = '' } = useParams<{ tabKey: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const rawSeg = tabKey.toLowerCase().trim();
  const listValid = KNOWN_COLLECTION_SEGMENTS.has(rawSeg);
  const tab: keyof UserPostCollections = listValid ? collectionsTabFromParam(tabKey) : 'saved';

  const [collections, setCollections] = useState<UserPostCollections>(EMPTY);
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [shareTarget, setShareTarget] = useState<Post | null>(null);

  const syncCollectionsQuiet = useCallback(async () => {
    if (!user?.id) return;
    const [cols, intents] = await Promise.all([
      loadUserPostCollections(user.id, user.id),
      getPostIntentsForUser(user.id),
    ]);
    setCollections(cols);
    setSavedPostIds(new Set(intents.filter(i => i.intent_type === 'saved').map(i => i.post_id)));
  }, [user?.id]);

  useEffect(() => {
    if (!listValid) return;
    if (!user?.id) {
      setCollections(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    void syncCollectionsQuiet().finally(() => setLoading(false));
  }, [listValid, user?.id, tabKey, syncCollectionsQuiet]);

  const collectionsRealtimeSpecs = useMemo(
    () =>
      user?.id
        ? [
            { table: 'post_intents', filter: `user_id=eq.${user.id}` },
            { table: 'reactions' },
            { table: 'comments' },
            { table: 'posts' },
          ]
        : [],
    [user?.id],
  );

  useDebouncedRealtime({
    channelName: user?.id ? `collections-${user.id}` : 'collections-off',
    specs: collectionsRealtimeSpecs,
    enabled: Boolean(user?.id && listValid),
    debounceMs: 450,
    onEvent: () => void syncCollectionsQuiet(),
  });

  function openPost(p: Post) {
    openAppPostInNewTab(p.id, `${location.pathname}${location.search}`);
  }

  async function handleCollectionLike(post: Post) {
    if (!user?.id) return;
    const vr = post.viewer_reactions ?? [];
    const had = vr.includes('like');
    const nextVr: ReactionType[] = had ? vr.filter((t) => t !== 'like') : [...vr, 'like'];
    const bump = (list: Post[]) =>
      list.map(pRow =>
        pRow.id !== post.id
          ? pRow
          : {
              ...pRow,
              viewer_reactions: nextVr,
              like_count: Math.max(0, (pRow.like_count ?? 0) + (had ? -1 : 1)),
            },
      );
    setCollections(prev => ({
      saved: bump(prev.saved),
      liked: bump(prev.liked),
      been_there: bump(prev.been_there),
      want_to_go: bump(prev.want_to_go),
      favorite: bump(prev.favorite),
    }));
    try {
      const result = await reactToPost(post.id, user.id, 'like');
      const apply = (pRow: Post): Post =>
        pRow.id !== post.id
          ? pRow
          : {
              ...pRow,
              like_count: result.like_count,
              still_there_count: result.still_there_count,
              viewer_reactions: result.viewer_reactions,
            };
      setCollections(prev => ({
        saved: prev.saved.map(apply),
        liked:
          result.viewer_reactions.includes('like')
            ? prev.liked.map(apply)
            : prev.liked.filter(pRow => pRow.id !== post.id),
        been_there: prev.been_there.map(apply),
        want_to_go: prev.want_to_go.map(apply),
        favorite: prev.favorite.map(apply),
      }));
    } catch {
      void syncCollectionsQuiet();
    }
  }

  async function handleCollectionToggleSaved(post: Post) {
    if (!user?.id) return;
    const existed = savedPostIds.has(post.id);
    setSavedPostIds(prev => {
      const next = new Set(prev);
      if (existed) next.delete(post.id);
      else next.add(post.id);
      return next;
    });
    try {
      await togglePostIntent(user.id, post.id, 'saved');
      await syncCollectionsQuiet();
    } catch {
      setSavedPostIds(prev => {
        const next = new Set(prev);
        if (existed) next.add(post.id);
        else next.delete(post.id);
        return next;
      });
    }
  }

  const activeMeta = COLLECTION_SECTIONS.find(s => s.key === tab);
  const activePosts = collections[tab];
  const SectionIcon = activeMeta?.icon;

  if (!listValid) {
    return <Navigate to="/app/collections/saved" replace />;
  }

  return (
    <div className="relative flex flex-col min-h-full bg-[#faf9f5] px-4 pb-28">
      <header className="sticky top-0 z-[400] -mx-4 px-4 pt-4 pb-3 bg-[#faf9f5]/92 backdrop-blur-md border-b border-[#e5e7eb]/60">
        <div className="flex items-center gap-2 mb-3">
          <Link
            to="/app/profile"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#e5e7eb] bg-white text-[#2f5fc4] shadow-sm transition-all duration-200 motion-safe:active:scale-95"
            aria-label="Back to profile"
          >
            <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="brand text-2xl font-black text-[#2f5fc4] tracking-tight leading-tight">My lists</h1>
            <p className="text-xs text-[#6b7280] font-medium">Saved & liked open on their own screen</p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
          {COLLECTION_SECTIONS.map(({ key, title, icon: Icon, iconWrap, headerBg }) => {
            const count = collections[key].length;
            const on = tab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => navigate(pathForCollectionsTab(key))}
                className={[
                  'flex shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 text-left transition-all duration-200 motion-safe:active:scale-[0.98]',
                  on
                    ? 'border-[#2f5fc4] bg-white shadow-[0_8px_22px_rgba(47,95,196,0.18)] ring-2 ring-[#2f5fc4]/15'
                    : 'border-[#e5e7eb] bg-white/90 hover:border-[#2f5fc4]/25',
                ].join(' ')}
              >
                <span className={['flex h-8 w-8 items-center justify-center rounded-xl border', iconWrap, headerBg].join(' ')}>
                  <Icon className="w-3.5 h-3.5" strokeWidth={2.25} aria-hidden />
                </span>
                <span className="flex flex-col min-w-0">
                  <span className="text-[11px] font-black text-[#1a1a1a] leading-tight">{title}</span>
                  <span className="text-[10px] font-bold text-[#9ca3af] tabular-nums">{count} {count === 1 ? 'item' : 'items'}</span>
                </span>
              </button>
            );
          })}
        </div>
      </header>

      {activeMeta && SectionIcon && (
        <section
          key={tab}
          className="mt-4 rounded-[24px] border border-[#e8ecf4] bg-white shadow-[0_10px_32px_rgba(47,95,196,0.08)] overflow-hidden nommi-fade-rise"
        >
          <div className={['flex items-start gap-3 px-4 py-3.5 border-b border-[#eef2f6]', activeMeta.headerBg].join(' ')}>
            <span className={['flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border shadow-sm', activeMeta.iconWrap].join(' ')}>
              <SectionIcon className="w-4 h-4" strokeWidth={2.25} aria-hidden />
            </span>
            <div className="min-w-0 pt-0.5">
              <h2 className="text-sm font-black text-[#1a1a1a] tracking-tight">{activeMeta.title}</h2>
              <p className="text-[11px] text-[#6b7280] font-medium leading-snug mt-0.5">
                {tab === 'saved'
                  ? 'Use “Open full post” or tap the card — opens in a new tab with a Back target to this list.'
                  : tab === 'liked'
                    ? 'Opens each post in a new tab so the layout never clips.'
                    : activeMeta.subtitle}
              </p>
            </div>
          </div>
          <div className="p-3 bg-[#faf9f5]/50">
            <PostGrid
              posts={activePosts}
              loading={loading}
              showProminentOpen
              onPostClick={openPost}
              onSharePost={user?.id ? p => setShareTarget(p) : undefined}
              onLikePost={user?.id ? handleCollectionLike : undefined}
              onToggleSavedPost={user?.id ? handleCollectionToggleSaved : undefined}
              savedPostIds={savedPostIds}
              emptyTitle="Nothing here yet"
              emptyDescription={
                tab === 'saved'
                  ? 'Save posts from the feed or a post detail — they land here.'
                  : tab === 'liked'
                    ? 'Heart posts you love; they collect here automatically.'
                    : tab === 'been_there'
                      ? 'Mark places you have visited from a post.'
                      : tab === 'want_to_go'
                        ? 'Build your bucket list from posts you want to try.'
                        : 'Pin all-time favorites from posts you open.'
              }
              emptyImageSrc={emptyNoPostsYetSimple}
              emptyImageAlt="Empty list"
              emptyImageClassName="w-32 max-w-[9rem] h-auto mx-auto mb-3 object-contain opacity-90"
              gridClassName="grid gap-3 mt-0"
            />
          </div>
        </section>
      )}

      {user && (
        <ShareToCircleModal
          open={!!shareTarget}
          onClose={() => setShareTarget(null)}
          post={shareTarget}
          userId={user.id}
          onShared={() => void syncCollectionsQuiet()}
        />
      )}
    </div>
  );
}
