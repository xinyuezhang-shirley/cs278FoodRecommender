import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';
import { CUISINE_OPTIONS } from '../../utils/helpers';
import { CUISINE_EMOJI, labelCuisineFilterToken } from '../../utils/cuisineUi';

interface Props {
  cuisineTags: string[];
  onToggleCuisine: (tag: string) => void;
}

export function CuisineTagsFormField({ cuisineTags, onToggleCuisine }: Props) {
  const [open, setOpen] = useState(false);
  const [presetQuery, setPresetQuery] = useState('');
  const [customInput, setCustomInput] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const normalizedSelected = cuisineTags.map(t => t.trim().toLowerCase());
  const otherSelected = useMemo(
    () => [...new Set(cuisineTags.map(t => t.trim().toLowerCase()))].filter(t => !CUISINE_OPTIONS.includes(t)),
    [cuisineTags],
  );

  const filteredPresets = useMemo(() => {
    const q = presetQuery.trim().toLowerCase();
    return CUISINE_OPTIONS.filter(t => (q ? t.includes(q) : true));
  }, [presetQuery]);

  function addCustom() {
    const normalized = customInput.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!normalized) return;
    if (!normalizedSelected.includes(normalized)) onToggleCuisine(normalized);
    setCustomInput('');
    setPresetQuery('');
  }

  const panelLabel =
    cuisineTags.length === 0 ? 'Food categories' : `Food categories · ${cuisineTags.length}`;
  const hasSel = cuisineTags.length > 0;

  return (
    <div className="px-4 py-3 space-y-3">
      <div>
        <p className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wide mb-2">
          Food categories
        </p>
        <p className="text-[11px] text-[#9ca3af] mb-2 leading-snug">
          Pick at least one category so others can discover your post in map and feed filters.
        </p>

        <div ref={ref} className="relative">
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className={[
              'flex items-center gap-1 min-h-[2rem] px-3 py-1.5 rounded-full text-xs font-bold transition-all border w-full sm:w-auto justify-between sm:justify-center',
              hasSel
                ? 'bg-[#2f5fc4] text-white border-[#2f5fc4] shadow-[0_6px_16px_rgba(47,95,196,0.22)]'
                : 'bg-[#f5f7ff] text-[#6b7280] border-[#e5e7eb]',
            ].join(' ')}
          >
            <span>{panelLabel}</span>
            <ChevronDown className="w-3 h-3 opacity-70 shrink-0" aria-hidden />
          </button>

          {open && (
            <div className="absolute top-11 left-0 z-[500] rounded-2xl overflow-hidden py-1 min-w-[min(100vw-2rem,260px)] max-h-[min(70vh,340px)] overflow-y-auto bg-white border border-[#e5e7eb] shadow-[0_12px_32px_rgba(47,95,196,0.14)]">
              <p className="px-4 pt-2 pb-1 text-[10px] font-black uppercase tracking-wide text-[#9ca3af]">
                Presets
              </p>
              <input
                type="search"
                value={presetQuery}
                onChange={e => setPresetQuery(e.target.value)}
                placeholder="Search…"
                className="mx-4 mb-2 w-[calc(100%-2rem)] px-3 py-2 rounded-xl text-xs border border-[#e5e7eb] outline-none focus:ring-2 focus:ring-[#2f5fc4]/20"
              />
              {filteredPresets.map(tag => {
                const sel = normalizedSelected.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => onToggleCuisine(tag)}
                    className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm hover:bg-[#faf9f5] text-left capitalize transition-colors"
                  >
                    <span className="text-[#1a1a1a] flex items-center gap-1.5">
                      {CUISINE_EMOJI[tag] && <span aria-hidden>{CUISINE_EMOJI[tag]}</span>}
                      {tag}
                    </span>
                    {sel && <Check className="w-3.5 h-3.5 text-[#2f5fc4] shrink-0" aria-hidden />}
                  </button>
                );
              })}

              <div className="mx-4 my-2 border-t border-[#eef2f6]" />

              <p className="px-4 pt-1 pb-1 text-[10px] font-black uppercase tracking-wide text-[#9ca3af]">
                Other
              </p>
              {otherSelected.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => onToggleCuisine(tag)}
                    className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm hover:bg-[#faf9f5] text-left transition-colors"
                  >
                    <span className="text-[#1a1a1a]">{tag}</span>
                    <Check className="w-3.5 h-3.5 text-[#2f5fc4] shrink-0" aria-hidden />
                  </button>
                ))}

              <div className="px-4 py-2 flex gap-2">
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
                  placeholder="Add custom category"
                  className="flex-1 min-w-0 px-3 py-2 rounded-xl text-xs border border-[#e5e7eb] outline-none focus:ring-2 focus:ring-[#2f5fc4]/20"
                />
                <button
                  type="button"
                  onClick={addCustom}
                  className="shrink-0 px-3 py-2 text-xs font-bold rounded-xl border border-[#e5e7eb] text-[#2f5fc4]"
                >
                  Add
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {cuisineTags.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Selected food categories">
          {cuisineTags.map(tag => {
            const key = tag.trim().toLowerCase();
            return (
              <button
                key={key}
                type="button"
                onClick={() => onToggleCuisine(tag)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all"
                style={{ background: '#ede9fe', color: '#6d28d9', borderColor: '#c4b5fd' }}
              >
                <span>{CUISINE_OPTIONS.includes(key) ? labelCuisineFilterToken(key) : tag}</span>
                <X className="w-3 h-3 shrink-0 opacity-80" aria-hidden />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
