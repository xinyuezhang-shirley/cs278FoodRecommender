import { useRef, useState } from 'react';
import { Camera, X, Link2 } from 'lucide-react';

interface Props {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
}

export function ImageUploader({ value, onChange }: Props) {
  const [showUrl, setShowUrl] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      onChange(ev.target?.result as string);
      setShowUrl(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function applyUrl() {
    const u = urlDraft.trim();
    if (u) { onChange(u); setShowUrl(false); setUrlDraft(''); }
  }

  if (value) {
    return (
      <div className="relative">
        <img
          src={value}
          alt=""
          className="w-full object-cover bg-[#f3f4f6]"
          style={{ maxHeight: '380px', borderRadius: '0' }}
        />
        <div
          className="absolute inset-x-0 top-0 h-16 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 100%)' }}
        />
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
        >
          <X className="w-4 h-4 text-white" />
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
        >
          <Camera className="w-3.5 h-3.5 text-white" />
          <span className="text-[11px] text-white font-medium">Change</span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    );
  }

  return (
    <div className="px-4 space-y-2">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="w-full flex flex-col items-center justify-center gap-3 rounded-2xl transition-colors active:bg-[#f3f4f6]"
        style={{
          minHeight: '176px',
          background: '#fafafa',
          border: '1.5px dashed #e2e8f0',
        }}
      >
        <div className="w-11 h-11 rounded-2xl bg-[#f1f5f9] flex items-center justify-center">
          <Camera style={{ width: 21, height: 21, color: '#94a3b8' }} />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-[#64748b]">Add a photo</p>
          <p className="text-xs text-[#94a3b8] mt-0.5">optional</p>
        </div>
      </button>

      {!showUrl ? (
        <button
          type="button"
          onClick={() => setShowUrl(true)}
          className="flex items-center gap-1.5 text-xs text-[#94a3b8] w-full justify-center py-0.5"
        >
          <Link2 className="w-3 h-3" />
          or paste an image URL
        </button>
      ) : (
        <div className="flex gap-2 items-center">
          <input
            autoFocus
            type="url"
            value={urlDraft}
            onChange={e => setUrlDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyUrl(); } }}
            placeholder="https://..."
            className="flex-1 px-3 py-2 bg-[#f3f4f6] rounded-xl text-sm outline-none placeholder-[#9ca3af]"
          />
          <button
            type="button"
            onClick={applyUrl}
            disabled={!urlDraft.trim()}
            className="px-3 py-2 rounded-xl text-sm font-semibold text-white flex-shrink-0 disabled:opacity-30"
            style={{ background: '#f43f5e' }}
          >
            Add
          </button>
          <button type="button" onClick={() => { setShowUrl(false); setUrlDraft(''); }}>
            <X className="w-4 h-4 text-[#9ca3af]" />
          </button>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}
