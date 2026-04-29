interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

import React from 'react';

export function EmptyState({ icon = '🍜', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="text-4xl mb-4 opacity-60">{icon}</div>
      <h3 className="text-base font-semibold text-[#1a1a1a] mb-1">{title}</h3>
      {description && <p className="text-sm text-[#6b7280] max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
