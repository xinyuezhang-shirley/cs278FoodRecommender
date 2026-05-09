import { useState, useEffect, useMemo } from 'react';
import { Check, X } from 'lucide-react';
import { BottomSheet } from '../ui/Modal';
import { sanitizeTags } from '../../utils/sanitize';
import {
  FEED_POPULAR_CATEGORIES,
  deriveOtherFeedCategoryTags,
} from './feedPopularCategories';
import type { Post } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  posts: Post[];
  /** Applied categories from parent (canonical). */
  selected: string[];
  onApply: (next: string[]) => void;
}

export function FoodCategorySheet({ open, onClose, posts, selected, onApply }: Props) {
  const [draft, setDraft] = useState<string[]>(selected);
  const [query, setQuery] = useState('');
  const [customInput, setCustomInput] = useState('');

  const otherFromPosts = useMemo(() => deriveOtherFeedCategoryTags(posts), [posts]);

  useEffect(() => {
    if (open) {
      setDraft(selected);
      setQuery('');
      setCustomInput('');
    }
  }, [open, selected]);

  const q = query.trim().toLowerCase();

  const popularFiltered = useMemo(
    () =>
      FEED_POPULAR_CATEGORIES.filter(
        c => !q || c.label.toLowerCase().includes(q) || c.slug.includes(q),
      ),
    [q],
  );

  const otherFiltered = useMemo(
    () => otherFromPosts.filter(t => !q || t.includes(q)),
    [otherFromPosts, q],
  );

  function toggle(slug: string) {
    const s = slug.trim().toLowerCase();
    if (!s) return;
    setDraft(prev => (prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]));
  }

  function addCustom() {
    const raw = customInput.trim();
    if (!raw) return;
    const normalized = sanitizeTags([raw])[0];
    if (!normalized) return;
    setDraft(prev => (prev.includes(normalized) ? prev : [...prev, normalized]));
    setCustomInput('');
    setQuery('');
  }

  function resetDraft() {
    setDraft([]);
  }

  function handleApply() {
    onApply([...new Set(draft.map(t => t.trim().toLowerCase()))]);
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="flex flex-col max-h-[min(85dvh,640px)] min-h-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <header className="flex items-center justify-between gap-3 shrink-0 pb-2 border-b border-[#eef2f6]">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wide text-[#9ca3af]">Food category</p>
            <h2 className="text-lg font-black text-[#2f5fc4] tracking-tight">Categories</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full border border-[#e5e7eb] bg-white text-[#6b7280] hover:bg-[#eaf1ff] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5" aria-hidden />
          </button>
        </header>

        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search categories…"
          className="mt-3 w-full px-4 py-3 rounded-[18px] border border-[#e5e7eb] bg-white text-sm outline-none focus:ring-2 focus:ring-[#2f5fc4]/25 min-h-[44px]"
        />

        <div className="flex-1 overflow-y-auto overscroll-contain py-3 space-y-5 min-h-0 touch-pan-y">
          <section aria-labelledby="feed-popular-cats">
            <h3 id="feed-popular-cats" className="text-[11px] font-black uppercase tracking-wide text-[#9ca3af] mb-2 px-0.5">
              Popular
            </h3>
            <ul className="space-y-1">
              {popularFiltered.map(({ slug, label, emoji }) => {
                const sel = draft.includes(slug);
                return (
                  <li key={slug}>
                    <button
                      type="button"
                      onClick={() => toggle(slug)}
                      className={[
                        'w-full flex items-center justify-between gap-3 px-3 py-3 rounded-2xl border text-left transition-colors min-h-[48px]',
                        sel
                          ? 'bg-[#eaf1ff] border-[#2f5fc4]/35 text-[#1a1a1a]'
                          : 'bg-white border-[#e5e7eb] text-[#374151] hover:border-[#2f5fc4]/25',
                      ].join(' ')}
                    >
                      <span className="font-semibold text-[15px]">
                        <span aria-hidden>{emoji}</span>{' '}
                        {label}
                      </span>
                      {sel && (
                        <Check className="w-5 h-5 text-[#2f5fc4] shrink-0" strokeWidth={2.5} aria-hidden />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section aria-labelledby="feed-other-cats">
            <h3 id="feed-other-cats" className="text-[11px] font-black uppercase tracking-wide text-[#9ca3af] mb-2 px-0.5">
              Other
            </h3>
            <p className="text-[11px] text-[#9ca3af] mb-2 px-0.5 leading-snug">
              Tags from your campus posts — tap to filter.
            </p>
            {otherFiltered.length === 0 ? (
              <p className="text-sm text-[#9ca3af] px-1 py-2">No extra tags yet{q ? ' for this search' : ''}.</p>
            ) : (
              <ul className="space-y-1">
                {otherFiltered.map(slug => {
                  const sel = draft.includes(slug);
                  return (
                    <li key={slug}>
                      <button
                        type="button"
                        onClick={() => toggle(slug)}
                        className={[
                          'w-full flex items-center justify-between gap-3 px-3 py-3 rounded-2xl border text-left capitalize transition-colors min-h-[48px]',
                          sel
                            ? 'bg-[#fff7ed] border-[#fdba74]/70 text-[#9a3412]'
                            : 'bg-white border-[#e5e7eb] text-[#374151] hover:border-[#f59e0b]/35',
                        ].join(' ')}
                      >
                        <span className="font-semibold text-[15px]">{slug}</span>
                        {sel && (
                          <Check className="w-5 h-5 text-[#ea580c] shrink-0" strokeWidth={2.5} aria-hidden />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustom();
                  }
                }}
                placeholder="Add a custom category"
                className="flex-1 min-w-0 px-3 py-2.5 rounded-[16px] border border-[#e5e7eb] bg-white text-sm outline-none focus:ring-2 focus:ring-[#2f5fc4]/25 min-h-[44px]"
              />
              <button
                type="button"
                onClick={addCustom}
                className="shrink-0 px-4 py-2.5 rounded-[16px] text-sm font-black text-[#2f5fc4] bg-white border border-[#e5e7eb] min-h-[44px]"
              >
                Add
              </button>
            </div>
          </section>
        </div>

        <div className="shrink-0 flex gap-2 pt-3 pb-4 border-t border-[#eef2f6] bg-[#faf9f5]">
          <button
            type="button"
            onClick={resetDraft}
            className="flex-1 py-3.5 rounded-full text-sm font-bold text-[#6b7280] border border-[#e5e7eb] bg-white min-h-[48px]"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-[1.4] py-3.5 rounded-full text-sm font-black text-white bg-[#2f5fc4] shadow-[0_8px_24px_rgba(47,95,196,0.28)] min-h-[48px]"
          >
            Apply{draft.length > 0 ? ` (${draft.length})` : ''}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
