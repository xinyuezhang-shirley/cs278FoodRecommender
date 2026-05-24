import { useRef, useState } from 'react';
import { Camera, X, Link2, Loader2 } from 'lucide-react';
import { compressImageFileToPostDataUrl } from '../../utils/imageCompress';

interface Props {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
}

export function ImageUploader({ value, onChange }: Props) {
  const [showUrl, setShowUrl] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const [compressing, setCompressing] = useState(false);
  const [compressError, setCompressError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressError(null);

    const looksRaster =
      file.type.startsWith('image/')
      || /\.(jpe?g|png|gif|webp|heic|heif|bmp)$/i.test(file.name);

    if (!looksRaster) {
      setCompressError('Please choose an image file.');
      e.target.value = '';
      return;
    }

    setCompressing(true);
    try {
      const dataUrl = await compressImageFileToPostDataUrl(file);
      onChange(dataUrl);
      setShowUrl(false);
    } catch (err) {
      setCompressError(err instanceof Error ? err.message : 'Could not process image.');
    } finally {
      setCompressing(false);
      e.target.value = '';
    }
  }

  function isVideoUrl(url: string): boolean {
    return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url) || url.includes('youtube.com') || url.includes('youtu.be');
  }

  function isSafeMediaUrl(url: string): boolean {
    return /^https?:\/\//i.test(url) || /^data:image\//i.test(url);
  }

  function applyUrl() {
    const u = urlDraft.trim();
    if (!u) return;
    if (!isSafeMediaUrl(u)) return;
    onChange(u);
    setShowUrl(false);
    setUrlDraft('');
  }

  if (value) {
    return (
      <div className="space-y-2">
        <div className="relative">
          {isVideoUrl(value) ? (
            <video
              src={value}
              controls
              className="w-full object-cover bg-[#f3f4f6]"
              style={{ maxHeight: '380px', borderRadius: '0' }}
            />
          ) : (
            <img
              src={value}
              alt=""
              className="w-full object-cover bg-[#f3f4f6]"
              style={{ maxHeight: '380px', borderRadius: '0' }}
            />
          )}
          {compressing ? (
            <div
              className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 backdrop-blur-[1px]"
              style={{ background: 'rgba(0,0,0,0.28)' }}
              aria-busy="true"
              aria-label="Compressing photo"
            >
              <Loader2 className="h-7 w-7 animate-spin text-white" aria-hidden />
              <span className="text-xs font-semibold text-white">Optimizing photo…</span>
            </div>
          ) : null}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-16"
            style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 100%)' }}
          />
          <button
            type="button"
            onClick={() => onChange(undefined)}
            disabled={compressing}
            className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full disabled:opacity-40"
            style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
          >
            <X className="w-4 h-4 text-white" />
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={compressing}
            className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full px-2.5 py-1.5 disabled:opacity-40"
            style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
          >
            <Camera className="w-3.5 h-3.5 text-white" />
            <span className="text-[11px] font-medium text-white">{compressing ? '…' : 'Change'}</span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>
        {compressError ? (
          <p role="alert" className="px-4 text-xs leading-snug text-red-600">
            {compressError}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-2 px-4">
      <button
        type="button"
        disabled={compressing}
        onClick={() => fileRef.current?.click()}
        className="w-full flex flex-col items-center justify-center gap-3 rounded-2xl transition-colors active:bg-[#f3f4f6] disabled:opacity-60"
        style={{
          minHeight: '176px',
          background: '#fafafa',
          border: '1.5px dashed #e2e8f0',
        }}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f1f5f9]">
          {compressing ? (
            <Loader2 className="h-6 w-6 animate-spin text-[#94a3b8]" aria-hidden />
          ) : (
            <Camera style={{ width: 21, height: 21, color: '#94a3b8' }} aria-hidden />
          )}
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-[#64748b]">
            {compressing ? 'Optimizing photo…' : 'Add a photo'}
          </p>
          <p className="mt-0.5 text-xs text-[#94a3b8]">
            {compressing ? 'Large photos are shrunk automatically' : 'optional image or video URL'}
          </p>
        </div>
      </button>

      {!showUrl ? (
        <button
          type="button"
          disabled={compressing}
          onClick={() => setShowUrl(true)}
          className="flex w-full items-center justify-center gap-1.5 py-0.5 text-xs text-[#94a3b8] disabled:opacity-50"
        >
          <Link2 className="w-3 h-3" />
          or paste media URL
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

      {compressError ? (
        <p role="alert" className="text-center text-xs leading-snug text-red-600">
          {compressError}
        </p>
      ) : null}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}
