import { useState, useEffect } from 'react';
import type { FoodCircle, Post } from '../../types';
import {
  getAllCircles,
  getCircleIdsContainingPost,
  sharePostToCircles,
} from '../../services/circleService';
import { Modal } from '../ui/Modal';

interface ShareToCircleModalProps {
  open: boolean;
  onClose: () => void;
  post: Post | null;
  userId: string;
  onShared?: () => void;
}

export function ShareToCircleModal({ open, onClose, post, userId, onShared }: ShareToCircleModalProps) {
  const [circles, setCircles] = useState<FoodCircle[]>([]);
  const [already, setAlready] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !post) return;
    setError(null);
    setNote('');
    setSelected(new Set());
    setLoading(true);
    getAllCircles(userId)
      .then(async all => {
        const joined = all.filter(c => c.is_member);
        setCircles(joined);
        const ids = joined.map(c => c.id);
        const have = await getCircleIdsContainingPost(post.id, ids);
        setAlready(have);
      })
      .catch(() => setError('Could not load your circles.'))
      .finally(() => setLoading(false));
  }, [open, post, userId]);

  function toggle(id: string) {
    if (already.has(id)) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit() {
    if (!post || selected.size === 0) return;
    setBusy(true);
    setError(null);
    try {
      const { shared } = await sharePostToCircles(
        post.id,
        [...selected],
        userId,
        note.trim() || null,
      );
      if (shared > 0) {
        onShared?.();
        onClose();
      } else {
        setError('Already shared to the circles you selected.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not share.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Share to circle">
      <div className="px-4 pb-6 max-w-md mx-auto">
        <p className="text-sm text-[#6b7280] mb-3">
          Original post stays public. This adds it to a circle you belong to — you’re curating, not re-posting as the author.
        </p>
        {post && (
          <p className="text-sm font-bold text-[#1a1a1a] mb-4 line-clamp-2 border border-[#e5e7eb] rounded-2xl p-3 bg-[#f5f7ff]">
            {post.title}
          </p>
        )}

        {loading && <p className="text-sm text-[#6b7280]">Loading circles…</p>}
        {!loading && circles.length === 0 && (
          <p className="text-sm text-[#6b7280]">
            Join a food circle first, then you can share posts there from here or the Community tab.
          </p>
        )}

        {!loading && circles.length > 0 && (
          <ul className="space-y-2 mb-4 max-h-56 overflow-y-auto">
            {circles.map(c => {
              const sharedHere = already.has(c.id);
              const isOn = selected.has(c.id);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    disabled={sharedHere}
                    onClick={() => toggle(c.id)}
                    className={[
                      'w-full flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors',
                      sharedHere
                        ? 'border-[#e5e7eb] bg-[#faf9f5] opacity-60 cursor-not-allowed'
                        : isOn
                          ? 'border-[#2f5fc4] bg-[#eaf1ff]'
                          : 'border-[#e5e7eb] bg-white hover:bg-[#faf9f5]',
                    ].join(' ')}
                  >
                    <span className="text-xl" aria-hidden>{c.icon_type}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-black text-[#1a1a1a] truncate">{c.name}</span>
                      {sharedHere && (
                        <span className="text-xs font-bold text-[#6b7280]">Already shared here</span>
                      )}
                    </span>
                    {!sharedHere && (
                      <span className="text-xs font-black text-[#2f5fc4]">{isOn ? '✓' : ''}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {circles.length > 0 && (
          <label className="block mb-4">
            <span className="text-xs font-bold text-[#6b7280] uppercase tracking-wide">Optional note</span>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value.slice(0, 280))}
              rows={2}
              placeholder="Why this fits the circle…"
              className="mt-1 w-full rounded-2xl border border-[#e5e7eb] px-3 py-2 text-sm text-[#1a1a1a] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#2f5fc4]/20 focus:border-[#2f5fc4]"
            />
          </label>
        )}

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-bold bg-white border border-[#e5e7eb] text-[#2f5fc4]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || selected.size === 0 || circles.length === 0}
            onClick={handleSubmit}
            className="rounded-full px-5 py-2 text-sm font-black text-white bg-linear-to-r from-[#2f5fc4] to-[#6f90d8] shadow-[0_8px_20px_rgba(47,95,196,0.22)] disabled:opacity-50"
          >
            {busy ? 'Sharing…' : 'Share'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
