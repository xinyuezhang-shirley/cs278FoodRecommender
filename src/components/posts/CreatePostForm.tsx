import { useState, useRef } from 'react';
import { X } from 'lucide-react';
import type { CreatePostData, PostType } from '../../types';
import { createPost } from '../../services/postService';
import { useAuth } from '../../context/AuthContext';
import { CUISINE_OPTIONS, DIETARY_OPTIONS } from '../../utils/helpers';
import { ImageUploader } from './ImageUploader';
import { LocationPicker } from './LocationPicker';

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
  return (
    <div className="px-4 py-3 space-y-4">
      {/* Cuisine */}
      <div>
        <p className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wide mb-2.5">Cuisine</p>
        <div className="flex flex-wrap gap-2">
          {CUISINE_OPTIONS.map(tag => {
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

interface CreatePostFormProps {
  onSuccess: (postId: string) => void;
  onCancel: () => void;
  defaultCircleId?: string;
}

export function CreatePostForm({ onSuccess, onCancel, defaultCircleId }: CreatePostFormProps) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  const [form, setForm] = useState<CreatePostData>({
    type: 'recommendation',
    title: '',
    description: '',
    image_url: undefined,
    location_name: '',
    latitude: undefined,
    longitude: undefined,
    cuisine_tags: [],
    dietary_tags: [],
    is_free_food: false,
    expires_at: undefined,
    circle_id: defaultCircleId,
  });

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
      const curr = prev[list];
      return {
        ...prev,
        [list]: curr.includes(tag) ? curr.filter(t => t !== tag) : [...curr, tag],
      };
    });
  }

  function handleLocationSelect(name: string, lat?: number, lng?: number) {
    setField('location_name', name);
    setField('latitude', lat);
    setField('longitude', lng);
  }

  async function handlePost() {
    if (!user || !canPost) return;
    setError(null);
    setSubmitting(true);
    try {
      const post = await createPost(form, user.id);
      onSuccess(post.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  }

  const canPost =
    (form.title.trim().length > 0 || !!form.image_url) &&
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
        <span className="flex-1 text-center text-[15px] font-semibold text-[#1a1a1a]">New Post</span>
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
          {submitting ? 'Posting…' : 'Post'}
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
            autoFocus
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
