import React from 'react';

interface EmptyStateProps {
  icon?: string;
  /** When set, shows illustration instead of the emoji icon. */
  imageSrc?: string;
  imageAlt?: string;
  /** Applied to img; default sizing keeps layout similar to emoji block. */
  imageClassName?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon = '🍜',
  imageSrc,
  imageAlt = 'Nommi empty illustration',
  imageClassName = 'w-36 max-w-[min(100%,10rem)] h-auto mx-auto mb-4 object-contain drop-shadow-[0_4px_12px_rgba(47,95,196,0.12)]',
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {imageSrc ? (
        <img src={imageSrc} alt={imageAlt} className={`${imageClassName} nommi-float-soft`} />
      ) : (
        <div className="text-5xl mb-4 drop-shadow-[0_4px_12px_rgba(47,95,196,0.12)] nommi-float-soft" aria-hidden>
          {icon}
        </div>
      )}
      <h3 className="text-xl font-black text-[#2f5fc4] mb-2 tracking-tight">{title}</h3>
      {description && <p className="text-sm text-[#6b7280] max-w-xs leading-relaxed">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
