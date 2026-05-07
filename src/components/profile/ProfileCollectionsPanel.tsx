import { Bookmark, Heart, MapPin, Sparkles, Star, Flag } from 'lucide-react';
import type { Post } from '../../types';
import type { UserPostCollections } from '../../services/interactionService';
import { PostGrid } from '../posts/PostGrid';

interface Props {
  collections: UserPostCollections;
  savedPostIds: Set<string>;
  onPostClick: (post: Post) => void;
  onSharePost?: (post: Post) => void;
  onLikePost?: (post: Post) => void;
  onToggleSavedPost?: (post: Post) => void;
}

export const COLLECTION_SECTIONS: Array<{
  key: keyof UserPostCollections;
  title: string;
  subtitle: string;
  icon: typeof Heart;
  headerBg: string;
  iconWrap: string;
}> = [
  {
    key: 'saved',
    title: 'Saved',
    subtitle: 'Tap a post to open it and leave comments.',
    icon: Bookmark,
    headerBg: 'bg-amber-50/90',
    iconWrap: 'text-amber-800 bg-white border-amber-200',
  },
  {
    key: 'liked',
    title: 'Liked',
    subtitle: 'Posts you’ve hearted — open any to join the conversation.',
    icon: Heart,
    headerBg: 'bg-rose-50/90',
    iconWrap: 'text-rose-700 bg-white border-rose-200',
  },
  {
    key: 'been_there',
    title: 'Been there',
    subtitle: 'Places you’ve visited.',
    icon: MapPin,
    headerBg: 'bg-teal-50/90',
    iconWrap: 'text-teal-800 bg-white border-teal-200',
  },
  {
    key: 'want_to_go',
    title: 'Want to go',
    subtitle: 'Your food bucket list.',
    icon: Flag,
    headerBg: 'bg-violet-50/90',
    iconWrap: 'text-violet-800 bg-white border-violet-200',
  },
  {
    key: 'favorite',
    title: 'Favorites',
    subtitle: 'All-time picks.',
    icon: Star,
    headerBg: 'bg-fuchsia-50/90',
    iconWrap: 'text-fuchsia-800 bg-white border-fuchsia-200',
  },
];

export function ProfileCollectionsPanel({
  collections,
  savedPostIds,
  onPostClick,
  onSharePost,
  onLikePost,
  onToggleSavedPost,
}: Props) {
  const total =
    collections.saved.length
    + collections.liked.length
    + collections.been_there.length
    + collections.want_to_go.length
    + collections.favorite.length;

  if (total === 0) {
    return (
      <section className="mt-6 rounded-[24px] border border-dashed border-[#e5e7eb] bg-white/80 px-4 py-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#f5f7ff] text-[#2f5fc4] mb-3">
          <Sparkles className="w-6 h-6" aria-hidden />
        </div>
        <h3 className="text-sm font-black text-[#1a1a1a] mb-1">Your collections</h3>
        <p className="text-xs text-[#6b7280] leading-relaxed max-w-xs mx-auto">
          Save posts from the feed or tap Save / Like on a post. Everything shows up here with full comments.
        </p>
      </section>
    );
  }

  return (
    <div className="mt-6 space-y-5">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <h3 className="text-xs font-black text-[#6f90d8] uppercase tracking-widest">Collections</h3>
        <span className="text-[10px] font-bold text-[#9ca3af]">{total} total</span>
      </div>

      {COLLECTION_SECTIONS.map(({ key, title, subtitle, icon: Icon, headerBg, iconWrap }) => {
        const posts = collections[key];
        if (posts.length === 0) return null;

        return (
          <section
            key={key}
            className="rounded-[24px] border border-[#e8ecf4] bg-white shadow-[0_8px_28px_rgba(47,95,196,0.07)] overflow-hidden"
          >
            <div className={['flex items-start gap-3 px-4 py-3.5 border-b border-[#eef2f6]', headerBg].join(' ')}>
              <span className={['flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border shadow-sm', iconWrap].join(' ')}>
                <Icon className="w-4 h-4" strokeWidth={2.25} aria-hidden />
              </span>
              <div className="min-w-0 pt-0.5">
                <h4 className="text-sm font-black text-[#1a1a1a] tracking-tight">{title}</h4>
                <p className="text-[11px] text-[#6b7280] font-medium leading-snug mt-0.5">{subtitle}</p>
              </div>
              <span className="ml-auto shrink-0 text-[11px] font-black text-[#2f5fc4] tabular-nums bg-white/90 px-2 py-0.5 rounded-full border border-[#e5e7eb]">
                {posts.length}
              </span>
            </div>
            <div className="p-3 bg-[#faf9f5]/50">
              <PostGrid
                posts={posts}
                onPostClick={onPostClick}
                onSharePost={onSharePost}
                onLikePost={onLikePost}
                onToggleSavedPost={onToggleSavedPost}
                savedPostIds={savedPostIds}
                emptyTitle=""
                gridClassName="grid gap-3 mt-0"
              />
            </div>
          </section>
        );
      })}
    </div>
  );
}
