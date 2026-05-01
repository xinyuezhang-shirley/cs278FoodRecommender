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
    <div className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-[#2f5fc4]/15 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={[
          'relative bg-[#faf9f5] w-full max-w-lg shadow-[0_24px_64px_rgba(47,95,196,0.18)] border border-[#e5e7eb]/80',
          fullScreen
            ? 'h-[100dvh] max-h-[100dvh] rounded-none overflow-y-auto overflow-x-hidden min-h-0'
            : 'max-h-[90dvh] overflow-y-auto overflow-x-hidden rounded-[28px] sm:rounded-[28px] mt-auto sm:mt-0',
        ].join(' ')}
        role="dialog"
        aria-modal="true"
      >
        {(title || !fullScreen) && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e7eb] sticky top-0 bg-[#faf9f5]/96 backdrop-blur-sm z-10">
            {title && <h2 className="text-base font-black text-[#2f5fc4]">{title}</h2>}
            <button
              type="button"
              onClick={onClose}
              className="ml-auto p-2 rounded-full hover:bg-white text-[#6b7280] border border-transparent hover:border-[#e5e7eb] transition-colors"
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
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-end justify-center">
      <div
        className="absolute inset-0 bg-[#2f5fc4]/20 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative bg-[#faf9f5] w-full max-w-lg rounded-t-[28px] max-h-[min(85dvh,640px)] shadow-[0_-12px_40px_rgba(47,95,196,0.18)] border-t border-[#e5e7eb] flex flex-col min-h-0 mx-auto"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-[#eaf1ff] rounded-full border border-[#e5e7eb]/60" />
        </div>
        {children}
      </div>
    </div>
  );
}
