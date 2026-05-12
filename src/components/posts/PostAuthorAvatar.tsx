import { Ghost } from 'lucide-react';
import type { Post } from '../../types';
import { getPostAuthorDisplay } from '../../utils/postAuthorPresentation';
import { Avatar } from '../ui/Avatar';

const AVATAR_WRAP: Record<'xs' | 'sm' | 'md', string> = {
  xs: 'w-6 h-6 [&_svg]:w-3 [&_svg]:h-3',
  sm: 'w-8 h-8 [&_svg]:w-4 [&_svg]:h-4',
  md: 'w-10 h-10 [&_svg]:w-[18px] [&_svg]:h-[18px]',
};

/** Avatar or neutral ghost icon for anonymous posts. */
export function PostAuthorAvatar({
  post,
  size = 'sm',
}: {
  post: Post;
  size?: 'xs' | 'sm' | 'md';
}) {
  const d = getPostAuthorDisplay(post);
  if (d.useAnonymousAvatar) {
    return (
      <div
        className={[
          AVATAR_WRAP[size],
          'flex shrink-0 items-center justify-center rounded-full border border-[#e0e7ff] bg-[#eef2ff]',
        ].join(' ')}
        aria-hidden
      >
        <Ghost className="text-[#5b6bcc]" strokeWidth={2.25} />
      </div>
    );
  }
  return (
    <Avatar
      username={d.avatarSeed}
      avatarUrl={d.avatarUrl}
      size={size === 'md' ? 'md' : size}
    />
  );
}
