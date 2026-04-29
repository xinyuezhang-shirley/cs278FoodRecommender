import { getInitials, getAvatarColor } from '../../utils/helpers';

interface AvatarProps {
  username: string;
  avatarUrl?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const SIZE_CLASSES = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-xl',
};

export function Avatar({ username, avatarUrl, size = 'sm' }: AvatarProps) {
  const initials = getInitials(username);
  const color = getAvatarColor(username);

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={username}
        className={[SIZE_CLASSES[size], 'rounded-full object-cover bg-[#f3f4f6] flex-shrink-0'].join(' ')}
        onError={(e) => {
          const el = e.currentTarget as HTMLImageElement;
          el.style.display = 'none';
          const fallback = el.nextElementSibling as HTMLElement;
          if (fallback) fallback.style.display = 'flex';
        }}
      />
    );
  }

  return (
    <div
      className={[
        SIZE_CLASSES[size],
        'rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0',
      ].join(' ')}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}
