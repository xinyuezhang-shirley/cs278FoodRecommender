import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import type { CreatePostData, PostType, Post } from '../../types';
import { createPost, updatePost, deletePost } from '../../services/postService';
import { sharePostToCircle } from '../../services/circleService';
import { useAuth } from '../../context/AuthContext';
import { DIETARY_OPTIONS } from '../../utils/helpers';
import { ImageUploader } from './ImageUploader';
import { CuisineTagsFormField } from './CuisineTagsFormField';
import { LocationPicker, type LocationSelection } from './LocationPicker';
import { Modal } from '../ui/Modal';
import type { LocationPickSource } from '../../types';
import { MAX_POST_IMAGE_DATA_URL_CHARS } from '../../utils/imageCompress';

/** Mobile Safari/WebKit often surface failed fetches as TypeError with message “Load failed”. */
function formatSubmitError(err: unknown): string {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === 'object'
        && err !== null
        && 'message' in err
        && typeof (err as { message: unknown }).message === 'string'
        ? (err as { message: string }).message
        : '';

  const trimmed = msg.trim();
  const isLoadFail =
    /^load failed$/i.test(trimmed)
    || /^failed to fetch$/i.test(trimmed)
    || /network\s*error/i.test(trimmed);

  if (isLoadFail) {
    return 'Network error (“Load failed”). Check connection, VPN, LAN vs localhost URLs, Supabase reachable from this device, and Google Maps key referrer rules if searching places.';
  }
  return msg.trim();
}

// ─── Post type selector ────────────────────────────────────────────────────

const POST_TYPES: {
  value: PostType;
  label: string;
  emoji: string;
  bg: string;
  color: string;
  border: string;
}[] = [
  { value: 'recommendation', label: 'Rec',       emoji: '⭐', bg: '#faf5ff', color: '#7c3aed', border: '#e9d5ff' },
  { value: 'free_food',      label: 'Free Food',  emoji: '🎁', bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  { value: 'event',          label: 'Event',      emoji: '🎉', bg: '#fff1f2', color: '#f43f5e', border: '#fecdd3' },
];

function PostTypeSelector({ value, onChange }: { value: PostType; onChange: (v: PostType) => void }) {
  return (
    <div className="flex gap-2 px-4 py-3">
      {POST_TYPES.map(t => {
        const active = value === t.value;
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={
              active
                ? { background: t.bg, color: t.color, border: `1.5px solid ${t.border}` }
                : { background: '#f9fafb', color: '#6b7280', border: '1.5px solid transparent' }
            }
          >
            <span>{t.emoji}</span>
            <span>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Expiration selector (free food only) ──────────────────────────────────

const EXPIRY_PRESETS = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '1 hr',   minutes: 60 },
  { label: '2 hr',   minutes: 120 },
];

function ExpirationSelector({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
}) {
  const [activePreset, setActivePreset] = useState<number | null>(null);
  const [showCustom, setShowCustom] = useState(false);

  function selectPreset(minutes: number) {
    setActivePreset(minutes);
    setShowCustom(false);
    onChange(new Date(Date.now() + minutes * 60_000).toISOString());
  }

  function openCustom() {
    setActivePreset(null);
    setShowCustom(true);
  }

  const minExpiry = new Date(Date.now() + 5 * 60_000).toISOString().slice(0, 16);

  return (
    <div className="px-4 py-3 space-y-3">
      <p className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wide">⏱ Available for</p>
      <div className="flex gap-2 flex-wrap">
        {EXPIRY_PRESETS.map(p => {
          const active = activePreset === p.minutes && !showCustom;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => selectPreset(p.minutes)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={
                active
                  ? { background: '#fffbeb', color: '#d97706', border: '1.5px solid #fde68a' }
                  : { background: '#f3f4f6', color: '#6b7280', border: '1.5px solid transparent' }
              }
            >
              {p.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={openCustom}
          className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
          style={
            showCustom
              ? { background: '#fffbeb', color: '#d97706', border: '1.5px solid #fde68a' }
              : { background: '#f3f4f6', color: '#6b7280', border: '1.5px solid transparent' }
          }
        >
          Custom
        </button>
      </div>
      {showCustom && (
        <input
          type="datetime-local"
          min={minExpiry}
          value={value ? value.slice(0, 16) : ''}
          onChange={e =>
            onChange(e.target.value ? new Date(e.target.value).toISOString() : undefined)
          }
          className="w-full px-3 py-2.5 bg-[#f3f4f6] rounded-xl text-sm outline-none"
        />
      )}
    </div>
  );
}

// ─── Dietary tags ─────────────────────────────────────────────────────────

function DietaryTagRow({
  dietaryTags,
  onToggleDietary,
}: {
  dietaryTags: string[];
  onToggleDietary: (t: string) => void;
}) {
  return (
    <div className="px-4 py-3 space-y-2">
      <p className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wide mb-2">Dietary</p>
      <p className="text-[11px] text-[#9ca3af] mb-2 leading-snug">Optional — helps friends with dietary needs.</p>
      <div className="flex flex-wrap gap-2">
        {DIETARY_OPTIONS.map(tag => {
          const active = dietaryTags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onToggleDietary(tag)}
              className="px-2.5 py-1 rounded-full text-xs font-medium border transition-all"
              style={
                active
                  ? { background: '#dcfce7', color: '#16a34a', borderColor: '#86efac' }
                  : { background: 'white', color: '#6b7280', borderColor: '#e5e7eb' }
              }
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Thin divider ─────────────────────────────────────────────────────────

function Divider() {
  return <div className="mx-4 border-t border-[#f3f4f6]" />;
}

// ─── Main form ────────────────────────────────────────────────────────────

function postToFormData(p: Post, defaultCircleId?: string): CreatePostData {
  return {
    type: p.type,
    title: p.title,
    description: p.description ?? '',
    image_url: p.image_url,
    location_name: p.location_name,
    latitude: p.latitude,
    longitude: p.longitude,
    place_website_url: p.place_website_url,
    google_maps_url: p.google_maps_url,
    cuisine_tags: [...p.cuisine_tags],
    dietary_tags: [...p.dietary_tags],
    is_free_food: p.is_free_food,
    expires_at: p.expires_at,
    circle_id: p.circle_id ?? defaultCircleId,
    is_anonymous: Boolean(p.is_anonymous),
  };
}

interface CreatePostFormProps {
  onSuccess: (postId: string) => void;
  onCancel: () => void;
  defaultCircleId?: string;
  /** Opens the form prefilled for editing; only the author should see this (enforced server-side). */
  editPost?: Post;
  onPostUpdated?: (post: Post) => void;
  /** Called after the post is deleted from the server (e.g. navigate away). */
  onPostDeleted?: () => void;
}

export function CreatePostForm({
  onSuccess,
  onCancel,
  defaultCircleId,
  editPost,
  onPostUpdated,
  onPostDeleted,
}: CreatePostFormProps) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  /** Dedicated flag so anonymous intent cannot drift from other `setForm` updates. */
  const [postAnonymously, setPostAnonymously] = useState(false);

  const [form, setForm] = useState<CreatePostData>(() =>
    editPost
      ? postToFormData(editPost, defaultCircleId)
      : {
          type: 'recommendation',
          title: '',
          description: '',
          image_url: undefined,
          location_name: '',
          latitude: undefined,
          longitude: undefined,
          place_website_url: undefined,
          google_maps_url: undefined,
          cuisine_tags: [],
          dietary_tags: [],
          is_free_food: false,
          expires_at: undefined,
          circle_id: defaultCircleId,
        },
  );

  useEffect(() => {
    if (!editPost) return;
    setForm(postToFormData(editPost, defaultCircleId));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload editor fields only when switching posts or circle default
  }, [editPost?.id, defaultCircleId]);

  const editPostModeKey = editPost?.id ?? '__draft__';
  useEffect(() => {
    if (editPostModeKey === '__draft__') setPostAnonymously(false);
  }, [editPostModeKey]);

  /** iOS keyboards + autoFocus cause layout churn; coarse pointers shouldn’t autofocus compose title. */
  const [finePointerAutofocusTitle, setFinePointerAutofocusTitle] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const sync = () => setFinePointerAutofocusTitle(mq.matches);
    sync();
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', sync);
    else mq.addListener(sync);
    return () => {
      if (typeof mq.removeEventListener === 'function') mq.removeEventListener('change', sync);
      else mq.removeListener(sync);
    };
  }, []);

  function setField<K extends keyof CreatePostData>(key: K, value: CreatePostData[K]) {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'type') {
        next.is_free_food = value === 'free_food';
        if (value !== 'free_food') next.expires_at = undefined;
      }
      return next;
    });
  }

  function toggleTag(list: 'cuisine_tags' | 'dietary_tags', tag: string) {
    setForm(prev => {
      const normalized = tag.trim().toLowerCase().replace(/\s+/g, ' ');
      const curr = prev[list].map(t => t.trim().toLowerCase());
      return {
        ...prev,
        [list]: curr.includes(normalized)
          ? curr.filter(t => t !== normalized)
          : [...new Set([...curr, normalized])],
      };
    });
  }

  function composePickSource(sel: LocationSelection): LocationPickSource | undefined {
    if (!sel.location_source) return sel.lat != null && sel.lng != null ? 'search' : undefined;
    if (sel.location_source === 'manual') return 'manual';
    if (sel.location_source === 'campus') return 'campus';
    return 'search';
  }

  function handleLocationSelect(sel: LocationSelection) {
    const trimmed = sel.name.trim();
    if (!trimmed) {
      setForm(prev => ({
        ...prev,
        location_name: '',
        latitude: undefined,
        longitude: undefined,
        place_website_url: undefined,
        google_maps_url: undefined,
        location_pick_source: undefined,
      }));
      return;
    }
    setForm(prev => ({
      ...prev,
      location_name: trimmed,
      latitude: sel.lat,
      longitude: sel.lng,
      place_website_url: sel.place_website_url,
      google_maps_url: sel.google_maps_url,
      location_pick_source: composePickSource(sel),
    }));
  }

  const baseCanPost =
    form.title.trim().length > 0 &&
    form.location_name.trim().length > 0 &&
    (!form.is_free_food || !!form.expires_at);

  async function handlePost() {
    if (!user || !baseCanPost) return;
    if (typeof form.image_url === 'string' && form.image_url.startsWith('data:')) {
      if (form.image_url.length > MAX_POST_IMAGE_DATA_URL_CHARS) {
        setError(
          'This photo is too large to embed in a post over the network. Pick a smaller image or paste an HTTPS image URL instead.',
        );
        return;
      }
    }
    if (form.cuisine_tags.length === 0) {
      setError('Please select at least one food category so others can find your post.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      if (editPost) {
        const updated = await updatePost(
          editPost.id,
          {
            type: form.type,
            title: form.title,
            description: form.description,
            image_url: form.image_url,
            location_name: form.location_name,
            latitude: form.latitude,
            longitude: form.longitude,
            place_website_url: form.place_website_url,
            google_maps_url: form.google_maps_url,
            cuisine_tags: form.cuisine_tags,
            dietary_tags: form.dietary_tags,
            is_free_food: form.is_free_food,
            expires_at: form.expires_at,
            circle_id: form.circle_id,
          },
          user.id,
        );
        onPostUpdated?.(updated);
        onSuccess(updated.id);
        return;
      }

      const circleTarget = defaultCircleId;
      const stripped = { ...form };
      delete stripped.circle_id;
      const payload: CreatePostData = {
        ...stripped,
        circle_id: undefined,
        is_anonymous: postAnonymously,
      };
      if (import.meta.env.DEV) {
        console.log('[CreatePost] submit', { postAnonymously, payloadIsAnonymous: payload.is_anonymous });
      }
      const post = await createPost(payload, user.id);
      if (circleTarget) {
        try {
          await sharePostToCircle(post.id, circleTarget, user.id);
        } catch {
          /* circle_posts may not exist yet or duplicate — post still visible globally */
        }
      }
      onSuccess(post.id);
    } catch (err: unknown) {
      setError(
        formatSubmitError(err) || (editPost ? 'Failed to save changes' : 'Failed to create post'),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmDelete() {
    if (!user?.id || !editPost) return;
    setDeleteError(null);
    setDeleting(true);
    try {
      await deletePost(editPost.id, user.id);
      setDeleteModalOpen(false);
      onPostDeleted?.();
    } catch (err: unknown) {
      setDeleteError(formatSubmitError(err) || 'Failed to delete post');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white">

      {/* ── Top bar (safe-area + sticky; fills modal flex chain on mobile) ── */}
      <div
        className="flex shrink-0 items-center border-b border-[#f3f4f6] bg-white px-4 pb-3 sticky top-0 z-30 pt-[max(12px,env(safe-area-inset-top,0px))]"
      >
        <button
          type="button"
          onClick={onCancel}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[#6b7280] hover:bg-[#f3f4f6] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <span className="flex-1 text-center text-[15px] font-semibold text-[#1a1a1a]">
          {editPost ? 'Edit post' : 'New Post'}
        </span>
        <button
          type="button"
          onClick={handlePost}
          disabled={!baseCanPost || submitting}
          className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
          style={
            baseCanPost && !submitting
              ? { background: '#f43f5e', color: 'white' }
              : { color: '#d1d5db' }
          }
        >
          {submitting ? (editPost ? 'Saving…' : 'Posting…') : editPost ? 'Save' : 'Post'}
        </button>
      </div>

      {/* ── Scrollable body ── */}
      <div className="min-h-0 flex-1 touch-manipulation overflow-y-auto overflow-x-hidden overscroll-y-contain [-webkit-overflow-scrolling:touch]">

        {error && (
          <div className="mx-4 mt-3 px-3 py-2 bg-red-50 text-red-600 text-sm rounded-xl">
            {error}
          </div>
        )}

        {/* 1. Image */}
        <div className="pt-4">
          <ImageUploader
            value={form.image_url}
            onChange={v => setField('image_url', v)}
          />
        </div>

        {/* 2. Caption — borderless, social-style */}
        <div className="px-5 pt-5 pb-3">
          <input
            type="text"
            value={form.title}
            onChange={e => setField('title', e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); descRef.current?.focus(); }
            }}
            placeholder="What did you find?"
            maxLength={100}
            autoFocus={Boolean(!editPost && finePointerAutofocusTitle)}
            className="w-full text-[19px] font-semibold text-[#1a1a1a] placeholder-[#c8cdd8] outline-none bg-transparent leading-snug"
          />
          <textarea
            ref={descRef}
            value={form.description}
            onChange={e => {
              setField('description', e.target.value);
              const el = descRef.current;
              if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }
            }}
            placeholder="Add details… (optional)"
            maxLength={500}
            rows={2}
            className="w-full mt-2.5 text-[15px] text-[#374151] placeholder-[#c8cdd8] outline-none bg-transparent resize-none leading-relaxed"
            style={{ minHeight: '52px' }}
          />
        </div>

        <Divider />

        {/* 3. Post type */}
        <PostTypeSelector
          value={form.type}
          onChange={v => setField('type', v as PostType)}
        />

        <Divider />

        {/* 4. Location */}
        <LocationPicker
          locationName={form.location_name}
          latitude={form.latitude}
          longitude={form.longitude}
          onSelect={handleLocationSelect}
        />
        {(form.google_maps_url || form.place_website_url || form.location_pick_source === 'manual') && (
          <div className="px-5 py-3 text-[11px] text-[#6b7280] space-y-1 bg-[#f8fafc] border-y border-[#eef2f6]">
            <p className="font-black uppercase tracking-wide text-[#9ca3af] text-[10px]">
              {form.location_pick_source === 'manual'
                ? 'Manual pin on map'
                : 'Saved from Google Places'}
            </p>
            {form.google_maps_url && (
              <p className="truncate"><span className="font-semibold text-[#475569]">Maps:</span>{' '}<span className="text-[#2f5fc4]">{form.google_maps_url}</span></p>
            )}
            {form.place_website_url && (
              <p className="truncate"><span className="font-semibold text-[#475569]">Site:</span>{' '}<span className="text-[#2f5fc4]">{form.place_website_url}</span></p>
            )}
          </div>
        )}

        <Divider />

        {/* 5. Tags */}
        <CuisineTagsFormField
          cuisineTags={form.cuisine_tags}
          onToggleCuisine={tag => toggleTag('cuisine_tags', tag)}
        />
        <DietaryTagRow
          dietaryTags={form.dietary_tags}
          onToggleDietary={tag => toggleTag('dietary_tags', tag)}
        />

        <Divider />

        {/* Anonymous — new posts only */}
        {!editPost && (
          <>
            <div className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#1a1a1a]">Post anonymously</p>
                  <p className="mt-1 text-[11px] leading-snug text-[#9ca3af]">
                    Your username will be hidden from other users.
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-[#9ca3af]">
                    This action cannot be undone.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={postAnonymously}
                  onClick={() => {
                    setPostAnonymously(v => {
                      const next = !v;
                      if (import.meta.env.DEV) {
                        console.log('[CreatePost] anonymous toggle →', next);
                      }
                      return next;
                    });
                  }}
                  className={[
                    'relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#2f5fc4]/35 focus-visible:ring-offset-2',
                    postAnonymously ? 'bg-[#2f5fc4]' : 'bg-[#e5e7eb]',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'absolute top-0.5 left-0.5 block h-6 w-6 rounded-full bg-white shadow transition-transform motion-safe:duration-200',
                      postAnonymously ? 'translate-x-5' : 'translate-x-0',
                    ].join(' ')}
                  />
                </button>
              </div>
            </div>
            <Divider />
          </>
        )}

        {editPost?.is_anonymous ? (
          <>
            <div className="mx-4 mt-1 rounded-xl border border-[#eef2f6] bg-[#fafbff] px-3 py-2.5">
              <p className="text-[13px] font-semibold text-[#374151]">Posted anonymously</p>
              <p className="mt-1 text-[11px] leading-snug text-[#9ca3af]">
                Anonymous posts stay anonymous permanently.
              </p>
            </div>
            <Divider />
          </>
        ) : null}

        {/* Expiration (free food only) */}
        {form.is_free_food && (
          <>
            <Divider />
            <ExpirationSelector
              value={form.expires_at}
              onChange={v => setField('expires_at', v)}
            />
          </>
        )}

        {editPost && (
          <>
            <Divider />
            <div className="px-4 py-4">
              <button
                type="button"
                onClick={() => {
                  setDeleteError(null);
                  setDeleteModalOpen(true);
                }}
                disabled={submitting || deleting}
                className="w-full py-3 rounded-xl text-sm font-semibold text-red-600 border border-red-200 bg-red-50/60 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                Delete post
              </button>
            </div>
          </>
        )}

        {/* Breathing room at the bottom */}
        <div className="h-10" />
      </div>

      {editPost && (
        <Modal
          open={deleteModalOpen}
          onClose={() => !deleting && setDeleteModalOpen(false)}
          title="Delete post?"
          elevated
        >
          <p className="px-4 pb-3 text-sm text-[#4b5563] leading-relaxed">
            Are you sure you want to delete this post? This cannot be undone.
          </p>
          {deleteError && (
            <div className="mx-4 mb-3 px-3 py-2 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
              {deleteError}
            </div>
          )}
          <div className="flex gap-2 px-4 pb-4">
            <button
              type="button"
              disabled={deleting}
              onClick={() => {
                setDeleteModalOpen(false);
                setDeleteError(null);
              }}
              className="flex-1 py-3 rounded-full text-sm font-semibold border border-[#e5e7eb] bg-white text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={() => void handleConfirmDelete()}
              className="flex-1 py-3 rounded-full text-sm font-black bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
