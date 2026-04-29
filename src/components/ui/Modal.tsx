import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  fullScreen?: boolean;
}

export function Modal({ open, onClose, children, title, fullScreen = false }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={[
          'relative bg-white w-full max-w-lg overflow-hidden shadow-2xl',
          fullScreen
            ? 'h-full rounded-none'
            : 'rounded-t-2xl sm:rounded-2xl max-h-[90dvh] overflow-y-auto',
        ].join(' ')}
        role="dialog"
        aria-modal="true"
      >
        {(title || !fullScreen) && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e7eb] sticky top-0 bg-white z-10">
            {title && <h2 className="text-base font-semibold text-[#1a1a1a]">{title}</h2>}
            <button
              onClick={onClose}
              className="ml-auto p-1.5 rounded-full hover:bg-[#f3f4f6] text-[#6b7280] transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function BottomSheet({ open, onClose, children }: BottomSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden />
      <div className="relative bg-white w-full rounded-t-2xl max-h-[80dvh] overflow-y-auto shadow-2xl">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-[#d1d5db] rounded-full" />
        </div>
        {children}
      </div>
    </div>
  );
}
