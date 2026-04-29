import type { Post, PostFilter, CreatePostData, ReactionType } from '../types';
import {
  getPosts, savePosts, getReactions, saveReactions,
  getComments, getProfileById,
} from './storageService';
import { generateId } from '../utils/helpers';
import { sanitizeText, sanitizeTags } from '../utils/sanitize';

function enrichPost(post: Post, currentUserId?: string): Post {
  const reactions = getReactions().filter(r => r.post_id === post.id);
  const comments = getComments().filter(c => c.post_id === post.id);
  const author = getProfileById(post.author_id);

  const userReaction = currentUserId
    ? (reactions.find(r => r.user_id === currentUserId)?.type ?? null)
    : null;

  return {
    ...post,
    author,
    like_count: reactions.filter(r => r.type === 'like').length,
    still_there_count: reactions.filter(r => r.type === 'still_there').length,
    comment_count: comments.length,
    user_reaction: userReaction,
  };
}

export async function getPaginatedPosts(
  filter: PostFilter = {},
  currentUserId?: string
): Promise<Post[]> {
  let posts = getPosts();

  if (filter.type && filter.type !== 'all') {
    posts = posts.filter(p => p.type === filter.type);
  }
  if (filter.dietary) {
    posts = posts.filter(p => p.dietary_tags.includes(filter.dietary!));
  }
  if (filter.cuisine) {
    posts = posts.filter(p => p.cuisine_tags.includes(filter.cuisine!));
  }
  if (filter.searchQuery) {
    const q = filter.searchQuery.toLowerCase();
    posts = posts.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.location_name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    );
  }
  if (filter.circleId) {
    posts = posts.filter(p => p.circle_id === filter.circleId);
  }

  posts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return posts.map(p => enrichPost(p, currentUserId));
}

export async function getPostById(id: string, currentUserId?: string): Promise<Post | null> {
  const post = getPosts().find(p => p.id === id);
  if (!post) return null;
  return enrichPost(post, currentUserId);
}

export async function getPostsByAuthor(authorId: string, currentUserId?: string): Promise<Post[]> {
  const posts = getPosts().filter(p => p.author_id === authorId);
  posts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return posts.map(p => enrichPost(p, currentUserId));
}

export async function createPost(
  data: CreatePostData,
  authorId: string
): Promise<Post> {
  if (!data.title.trim()) throw new Error('Title is required');
  if (!data.location_name.trim()) throw new Error('Location is required');
  if (data.is_free_food && !data.expires_at) throw new Error('Expiration time is required for free food posts');
  if (data.description && data.description.length > 500) throw new Error('Description must be 500 characters or less');

  const now = new Date().toISOString();
  const post: Post = {
    id: generateId(),
    author_id: authorId,
    type: data.type,
    title: sanitizeText(data.title, 100),
    description: sanitizeText(data.description, 500),
    image_url: data.image_url?.trim() || undefined,
    location_name: sanitizeText(data.location_name, 100),
    latitude: data.latitude,
    longitude: data.longitude,
    cuisine_tags: sanitizeTags(data.cuisine_tags),
    dietary_tags: sanitizeTags(data.dietary_tags),
    is_free_food: data.is_free_food,
    expires_at: data.expires_at,
    circle_id: data.circle_id,
    created_at: now,
    updated_at: now,
  };

  const posts = getPosts();
  posts.unshift(post);
  savePosts(posts);
  return enrichPost(post, authorId);
}

export async function updatePost(
  id: string,
  data: Partial<CreatePostData>,
  currentUserId: string
): Promise<Post> {
  const posts = getPosts();
  const idx = posts.findIndex(p => p.id === id);
  if (idx === -1) throw new Error('Post not found');
  if (posts[idx].author_id !== currentUserId) throw new Error('Not authorized to edit this post');

  const updated = {
    ...posts[idx],
    ...data,
    title: data.title ? sanitizeText(data.title, 100) : posts[idx].title,
    description: data.description ? sanitizeText(data.description, 500) : posts[idx].description,
    location_name: data.location_name ? sanitizeText(data.location_name, 100) : posts[idx].location_name,
    cuisine_tags: data.cuisine_tags ? sanitizeTags(data.cuisine_tags) : posts[idx].cuisine_tags,
    dietary_tags: data.dietary_tags ? sanitizeTags(data.dietary_tags) : posts[idx].dietary_tags,
    updated_at: new Date().toISOString(),
  };
  posts[idx] = updated;
  savePosts(posts);
  return enrichPost(updated, currentUserId);
}

export async function deletePost(id: string, currentUserId: string): Promise<void> {
  const posts = getPosts();
  const post = posts.find(p => p.id === id);
  if (!post) throw new Error('Post not found');
  if (post.author_id !== currentUserId) throw new Error('Not authorized to delete this post');
  savePosts(posts.filter(p => p.id !== id));
}

export async function reactToPost(
  postId: string,
  userId: string,
  type: ReactionType
): Promise<{ like_count: number; still_there_count: number; user_reaction: ReactionType | null }> {
  const reactions = getReactions();
  const existing = reactions.find(r => r.post_id === postId && r.user_id === userId);

  if (existing) {
    if (existing.type === type) {
      // Toggle off
      saveReactions(reactions.filter(r => r.id !== existing.id));
    } else {
      // Switch reaction type
      existing.type = type;
      saveReactions(reactions);
    }
  } else {
    reactions.push({ id: generateId(), post_id: postId, user_id: userId, type });
    saveReactions(reactions);
  }

  const updated = getReactions().filter(r => r.post_id === postId);
  const userReaction = updated.find(r => r.user_id === userId)?.type ?? null;

  return {
    like_count: updated.filter(r => r.type === 'like').length,
    still_there_count: updated.filter(r => r.type === 'still_there').length,
    user_reaction: userReaction,
  };
}
