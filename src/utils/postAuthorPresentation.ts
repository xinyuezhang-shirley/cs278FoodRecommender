import type { Post } from '../types';

/** Public name for anonymous posts (everyone sees this in the UI, including the author). */
export const ANONYMOUS_DISPLAY_NAME = 'anoni nommi';

/** Handle style when @-prefix is needed in the UI. */
export const ANONYMOUS_HANDLE = '@anoni_nommi';

export type PostAuthorDisplay =
  | {
      variant: 'anonymous_public';
      displayName: typeof ANONYMOUS_DISPLAY_NAME;
      handleLine: typeof ANONYMOUS_HANDLE;
      showProfileLink: false;
      useAnonymousAvatar: true;
      profileUserId?: undefined;
      avatarUrl?: undefined;
      avatarSeed: string;
    }
  | {
      variant: 'named';
      displayName: string;
      handleLine: string;
      showProfileLink: true;
      useAnonymousAvatar: false;
      profileUserId: string;
      avatarUrl?: string;
      avatarSeed: string;
    };

/**
 * Post authorship for UI. When `post.is_anonymous`, everyone (including the author) sees the mask —
 * ownership/edit still uses `post.author_id` elsewhere.
 */
export function getPostAuthorDisplay(post: Post): PostAuthorDisplay {
  if (post.is_anonymous) {
    return {
      variant: 'anonymous_public',
      displayName: ANONYMOUS_DISPLAY_NAME,
      handleLine: ANONYMOUS_HANDLE,
      showProfileLink: false,
      useAnonymousAvatar: true,
      avatarSeed: ANONYMOUS_DISPLAY_NAME,
    };
  }

  const username = post.author?.username ?? '…';
  const seed = post.author?.username ?? post.author_id ?? '?';

  return {
    variant: 'named',
    displayName: username,
    handleLine: `@${username}`,
    showProfileLink: true,
    useAnonymousAvatar: false,
    profileUserId: post.author_id,
    avatarUrl: post.author?.avatar_url,
    avatarSeed: seed,
  };
}
