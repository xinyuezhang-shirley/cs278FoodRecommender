import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  fullScreen?: boolean;
  /** Stack above another open modal (e.g. edit post on top of post detail). */
  elevated?: boolean;
}

export function Modal({ open, onClose, children, title, fullScreen = false, elevated = false }: ModalProps) {
  useEffect(() => {
    const html = document.documentElement;
    if (open) {
      html.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    } else {
      html.style.overflow = '';
      document.body.style.overflow = '';
    }
    return () => {
      html.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const shellZ = elevated ? 'z-[10050]' : 'z-[9999]';

  /** Full-screen: anchor with `fixed inset-0` + stretched flex child — avoids `100dvh` + `items-end` glitches on iOS (toolbar / keyboard resize). */
  if (fullScreen) {
    const fullScreenMarkup = (
      <div className={`fixed inset-0 ${shellZ} flex justify-center overscroll-none`}>
        <div
          className="absolute inset-0 bg-[#2f5fc4]/15 backdrop-blur-[2px]"
          onClick={onClose}
          aria-hidden
        />
        <div
          role="dialog"
          aria-modal="true"
          className="relative mx-auto flex h-full min-h-0 w-full max-w-lg flex-col overflow-hidden overscroll-y-contain border-x border-[#e5e7eb]/90 bg-[#faf9f5] shadow-[0_24px_64px_rgba(47,95,196,0.18)]"
        >
          {title ? (
            <div className="flex shrink-0 items-center justify-between border-b border-[#e5e7eb] bg-[#faf9f5] px-4 py-3">
              <h2 className="text-base font-black text-[#2f5fc4]">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-transparent p-2 text-[#6b7280] transition-colors hover:border-[#e5e7eb] hover:bg-white"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : null}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
        </div>
      </div>
    );

    return typeof document !== 'undefined' ? createPortal(fullScreenMarkup, document.body) : null;
  }

  const overlay = (
    <div
      className={[
        'fixed inset-0 flex items-end justify-center sm:items-center',
        shellZ,
      ].join(' ')}
    >
      <div
        className="absolute inset-0 bg-[#2f5fc4]/15 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={[
          'relative flex w-full max-w-lg flex-col border border-[#e5e7eb]/80 bg-[#faf9f5] shadow-[0_24px_64px_rgba(47,95,196,0.18)]',
          'max-h-[90dvh] min-h-0 overflow-y-auto overflow-x-hidden rounded-[28px] sm:rounded-[28px] mt-auto sm:mt-0',
        ].join(' ')}
        role="dialog"
        aria-modal="true"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e5e7eb] bg-[#faf9f5]/96 px-4 py-3 backdrop-blur-sm">
          {title ? <h2 className="text-base font-black text-[#2f5fc4]">{title}</h2> : null}
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-full border border-transparent p-2 text-[#6b7280] transition-colors hover:border-[#e5e7eb] hover:bg-white"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(overlay, document.body) : null;
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
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
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
