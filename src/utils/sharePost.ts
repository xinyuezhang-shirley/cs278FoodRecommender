import type { Post } from '../types';

function buildShareBody(post: Post): { title: string; text: string; url: string } {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const url = `${origin}/app/feed`;
  const bits = [
    post.title.trim(),
    post.location_name ? `📍 ${post.location_name}` : '',
    post.description?.trim() ? post.description.trim().slice(0, 400) : '',
    '',
    `Shared from Nommi — ${url}`,
  ].filter(Boolean);
  return {
    title: post.title.trim() || 'Food find on Nommi',
    text: bits.join('\n'),
    url,
  };
}

/**
 * Prefer the system share sheet; fall back to copying text + Nommi link to the clipboard.
 */
export async function sharePostExternal(post: Post): Promise<'shared' | 'copied' | 'cancelled'> {
  const { title, text, url } = buildShareBody(post);

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      await navigator.share({ title, text, url });
      return 'shared';
    }
  } catch (e: unknown) {
    if ((e as { name?: string })?.name === 'AbortError') return 'cancelled';
    // fall through to clipboard
  }

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      return 'copied';
    }
  } catch {
    /* ignore */
  }

  return 'cancelled';
}
