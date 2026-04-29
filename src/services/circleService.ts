import type { FoodCircle, Post } from '../types';
import {
  getCircles, getMemberships, saveMemberships, getProfileById, getPosts,
} from './storageService';
import { getPaginatedPosts } from './postService';

function enrichCircle(circle: FoodCircle, currentUserId?: string): FoodCircle {
  const memberships = getMemberships();
  const memberCount = memberships.filter(m => m.circle_id === circle.id).length;
  const isMember = currentUserId
    ? memberships.some(m => m.circle_id === circle.id && m.user_id === currentUserId)
    : false;
  return { ...circle, member_count: memberCount, is_member: isMember };
}

export async function getAllCircles(currentUserId?: string): Promise<FoodCircle[]> {
  return getCircles().map(c => enrichCircle(c, currentUserId));
}

export async function getCircleById(id: string, currentUserId?: string): Promise<FoodCircle | null> {
  const circle = getCircles().find(c => c.id === id);
  if (!circle) return null;
  return enrichCircle(circle, currentUserId);
}

export async function joinCircle(circleId: string, userId: string): Promise<FoodCircle> {
  const circles = getCircles();
  if (!circles.find(c => c.id === circleId)) throw new Error('Circle not found');

  const memberships = getMemberships();
  if (memberships.some(m => m.circle_id === circleId && m.user_id === userId)) {
    throw new Error('Already a member');
  }

  memberships.push({ circle_id: circleId, user_id: userId, joined_at: new Date().toISOString() });
  saveMemberships(memberships);

  const circle = circles.find(c => c.id === circleId)!;
  return enrichCircle(circle, userId);
}

export async function leaveCircle(circleId: string, userId: string): Promise<FoodCircle> {
  const memberships = getMemberships();
  const idx = memberships.findIndex(m => m.circle_id === circleId && m.user_id === userId);
  if (idx === -1) throw new Error('Not a member');
  memberships.splice(idx, 1);
  saveMemberships(memberships);

  const circle = getCircles().find(c => c.id === circleId)!;
  return enrichCircle(circle, userId);
}

export async function getCirclePosts(circleId: string, currentUserId?: string): Promise<Post[]> {
  return getPaginatedPosts({ circleId }, currentUserId);
}

export async function getTopContributors(limit = 5) {
  const posts = getPosts();
  const counts: Record<string, number> = {};
  for (const p of posts) {
    counts[p.author_id] = (counts[p.author_id] ?? 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([userId, count]) => ({
      profile: getProfileById(userId),
      post_count: count,
    }))
    .filter(c => c.profile != null);
}

export async function getUserCircleCount(userId: string): Promise<number> {
  return getMemberships().filter(m => m.user_id === userId).length;
}

export async function getUserFreeFoodCount(userId: string): Promise<number> {
  return getPosts().filter(p => p.author_id === userId && p.is_free_food).length;
}
