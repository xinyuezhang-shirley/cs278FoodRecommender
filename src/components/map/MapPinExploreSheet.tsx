import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Clock, MapPin, X } from 'lucide-react';
import type { Post } from '../../types';
import type { PlaceGroup } from '../../utils/groupPostsByLocation';
import { timeRemaining, isExpired } from '../../utils/helpers';
import { PostTypeBadge } from '../ui/Tag';
import { BottomSheet } from '../ui/Modal';

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

export function MapPinExploreSheet({ group, onClose, onOpenPostDetail }: MapPinExploreSheetProps) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [group?.id]);

  const posts = useMemo(
    () =>
      group
        ? [...group.posts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        : [],
    [group],
  );

  const chips = useMemo(() => (group ? derivePlaceChips(group.posts) : []), [group]);

  const previewPosts = expanded ? posts : posts.slice(0, PREVIEW_COUNT);

  if (!group) return null;

  return (
    <BottomSheet open onClose={onClose}>
      <div
        className={[
          'px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] flex flex-col',
          expanded ? 'max-h-[min(88dvh,720px)]' : 'max-h-[min(72dvh,560px)]',
        ].join(' ')}
      >
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#e5e7eb]/70 shrink-0">
          <div className="min-w-0">
            <h3 className="text-lg font-black text-[#2f5fc4] leading-snug break-words">
              {group.locationName}
            </h3>
            <p className="text-xs font-bold text-[#6f90d8] mt-1">
              {posts.length} post{posts.length !== 1 ? 's' : ''} here
            </p>
            {chips.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {chips.map(c => (
                  <span
                    key={c}
                    className="text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full bg-[#eaf1ff] text-[#2f5fc4] border border-[#e5e7eb]"
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
            className="shrink-0 w-9 h-9 rounded-full bg-[#faf9f5] border border-[#e5e7eb] flex items-center justify-center text-[#6b7280] hover:bg-white"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto min-h-0 flex-1 -mx-1 px-1 mt-3 space-y-2.5">
          {previewPosts.map(post => (
            <PostPreviewCard
              key={post.id}
              post={post}
              onOpen={() => {
                onOpenPostDetail(post);
                onClose();
              }}
            />
          ))}
        </div>

        {posts.length > PREVIEW_COUNT && (
          <button
            type="button"
            onClick={() => setExpanded(e => !e)}
            className="mt-3 w-full flex items-center justify-center gap-1.5 py-3 rounded-full border-2 border-[#2f5fc4] text-[#2f5fc4] text-sm font-black bg-white/80 hover:bg-[#eaf1ff]/60 transition-colors shrink-0"
          >
            {expanded ? 'Show less' : `View all ${posts.length} posts`}
            <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden />
          </button>
        )}
      </div>
    </BottomSheet>
  );
}

function PostPreviewCard({ post, onOpen }: { post: Post; onOpen: () => void }) {
  const expired = isExpired(post.expires_at);
  const remaining = post.expires_at && !expired ? timeRemaining(post.expires_at) : null;
  const author = post.author?.username ? `@${post.author.username}` : 'Someone';

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left rounded-2xl border border-[#e5e7eb] bg-white px-3.5 py-3 shadow-[0_4px_14px_rgba(47,95,196,0.06)] hover:border-[#2f5fc4]/35 transition-colors active:scale-[0.99]"
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <PostTypeBadge type={post.type} />
      </div>
      <p className="text-sm font-black text-[#1a1a1a] leading-snug line-clamp-2">{post.title}</p>
      <p className="text-[11px] font-bold text-[#6b7280] mt-1">{author}</p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1.5 text-[11px] text-[#6b7280]">
        <span className="inline-flex items-center gap-0.5 truncate max-w-full">
          <MapPin className="w-3 h-3 flex-shrink-0 text-[#6f90d8]" aria-hidden />
          <span className="truncate">{post.location_name?.trim() || 'Here'}</span>
        </span>
        {remaining && (
          <span className="inline-flex items-center gap-0.5 font-bold text-[#16a34a]">
            <Clock className="w-3 h-3" aria-hidden />
            {remaining}
          </span>
        )}
        {expired && post.expires_at && (
          <span className="text-[#9ca3af]">Ended</span>
        )}
      </div>
    </button>
  );
}
