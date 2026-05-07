import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import type { CreatePostData, PostType, Post } from '../../types';
import { createPost, updatePost } from '../../services/postService';
import { sharePostToCircle } from '../../services/circleService';
import { useAuth } from '../../context/AuthContext';
import { CUISINE_OPTIONS, DIETARY_OPTIONS } from '../../utils/helpers';
import { ImageUploader } from './ImageUploader';
import { LocationPicker, type LocationSelection } from './LocationPicker';

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

// ─── Tag selector ─────────────────────────────────────────────────────────

const CUISINE_EMOJI: Record<string, string> = {
  boba: '🧋', ramen: '🍜', sushi: '🍣', pizza: '🍕',
  coffee: '☕', sandwiches: '🥪', salad: '🥗', tacos: '🌮',
  burgers: '🍔', 'dim sum': '🥟', thai: '🍛', korean: '🥩',
  indian: '🫔', mediterranean: '🥙',
};

function TagSelector({
  cuisineTags,
  dietaryTags,
  onToggleCuisine,
  onToggleDietary,
}: {
  cuisineTags: string[];
  dietaryTags: string[];
  onToggleCuisine: (t: string) => void;
  onToggleDietary: (t: string) => void;
}) {
  const [cuisineSearch, setCuisineSearch] = useState('');
  const [customCuisine, setCustomCuisine] = useState('');
  const visibleCuisine = CUISINE_OPTIONS.filter(tag => tag.includes(cuisineSearch.toLowerCase()));

  function addCustomCuisine() {
    const normalized = customCuisine.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!normalized) return;
    onToggleCuisine(normalized);
    setCustomCuisine('');
    setCuisineSearch('');
  }

  return (
    <div className="px-4 py-3 space-y-4">
      {/* Cuisine */}
      <div>
        <p className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wide mb-2.5">Cuisine</p>
        <input
          type="text"
          value={cuisineSearch}
          onChange={e => setCuisineSearch(e.target.value)}
          placeholder="Search or add tags"
          className="w-full mb-2 px-3 py-2 bg-[#f3f4f6] rounded-xl text-sm outline-none"
        />
        <div className="flex flex-wrap gap-2">
          {visibleCuisine.map(tag => {
            const active = cuisineTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => onToggleCuisine(tag)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all"
                style={
                  active
                    ? { background: '#ede9fe', color: '#6d28d9', borderColor: '#c4b5fd' }
                    : { background: 'white', color: '#6b7280', borderColor: '#e5e7eb' }
                }
              >
                {CUISINE_EMOJI[tag] && <span>{CUISINE_EMOJI[tag]}</span>}
                {tag}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <input
            type="text"
            value={customCuisine}
            onChange={e => setCustomCuisine(e.target.value)}
            placeholder="Custom cuisine tag"
            className="flex-1 px-3 py-2 bg-[#f3f4f6] rounded-xl text-sm outline-none"
          />
          <button type="button" onClick={addCustomCuisine} className="px-3 py-2 text-xs font-bold rounded-xl border border-[#e5e7eb] text-[#2f5fc4]">
            Add
          </button>
        </div>
      </div>

      {/* Dietary */}
      <div>
        <p className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wide mb-2.5">Dietary</p>
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
  };
}

interface CreatePostFormProps {
  onSuccess: (postId: string) => void;
  onCancel: () => void;
  defaultCircleId?: string;
  /** Opens the form prefilled for editing; only the author should see this (enforced server-side). */
  editPost?: Post;
  onPostUpdated?: (post: Post) => void;
}

export function CreatePostForm({ onSuccess, onCancel, defaultCircleId, editPost, onPostUpdated }: CreatePostFormProps) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  const initialForm = (): CreatePostData =>
    editPost ? postToFormData(editPost, defaultCircleId) : {
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
    };

  const [form, setForm] = useState<CreatePostData>(initialForm);

  useEffect(() => {
    if (!editPost) return;
    setForm(postToFormData(editPost, defaultCircleId));
  }, [editPost?.id, defaultCircleId]);

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

  function handleLocationSelect(sel: LocationSelection) {
    const hasName = sel.name.trim().length > 0;
    setForm(prev => ({
      ...prev,
      location_name: sel.name,
      latitude: sel.lat,
      longitude: sel.lng,
      place_website_url: hasName ? sel.place_website_url : undefined,
      google_maps_url: hasName ? sel.google_maps_url : undefined,
    }));
  }

  async function handlePost() {
    if (!user || !canPost) return;
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
      const payload: CreatePostData = { ...stripped, circle_id: undefined };
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
      setError(err instanceof Error ? err.message : editPost ? 'Failed to save changes' : 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  }

  const canPost =
    form.title.trim().length > 0 &&
    form.location_name.trim().length > 0 &&
    (!form.is_free_food || !!form.expires_at);

  return (
    <div className="flex flex-col min-h-full bg-white">

      {/* ── Top bar ── */}
      <div className="flex items-center px-4 py-3 border-b border-[#f3f4f6] sticky top-0 z-10 bg-white">
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
          disabled={!canPost || submitting}
          className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
          style={
            canPost && !submitting
              ? { background: '#f43f5e', color: 'white' }
              : { color: '#d1d5db' }
          }
        >
          {submitting ? (editPost ? 'Saving…' : 'Posting…') : editPost ? 'Save' : 'Post'}
        </button>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">

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
            autoFocus={!editPost}
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
          onSelect={handleLocationSelect}
        />
        {(form.google_maps_url || form.place_website_url) && (
          <div className="px-5 py-3 text-[11px] text-[#6b7280] space-y-1 bg-[#f8fafc] border-y border-[#eef2f6]">
            <p className="font-black uppercase tracking-wide text-[#9ca3af] text-[10px]">Saved from Google Places</p>
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
        <TagSelector
          cuisineTags={form.cuisine_tags}
          dietaryTags={form.dietary_tags}
          onToggleCuisine={tag => toggleTag('cuisine_tags', tag)}
          onToggleDietary={tag => toggleTag('dietary_tags', tag)}
        />

        {/* 6. Expiration (free food only) */}
        {form.is_free_food && (
          <>
            <Divider />
            <ExpirationSelector
              value={form.expires_at}
              onChange={v => setField('expires_at', v)}
            />
          </>
        )}

        {/* Breathing room at the bottom */}
        <div className="h-10" />
      </div>
    </div>
  );
}
