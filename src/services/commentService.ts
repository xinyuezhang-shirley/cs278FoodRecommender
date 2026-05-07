import type { Comment, UserProfile } from '../types';
import { supabase } from '../lib/supabase';
import { profileLiteFromRow } from './profileHelpers';
import { sanitizeText } from '../utils/sanitize';
import { SEED_COMMENTS, SEED_PROFILES } from './mockData';

function mapCommentRow(row: Record<string, unknown>, author?: UserProfile): Comment {
  return {
    id: row.id as string,
    post_id: row.post_id as string,
    author_id: row.author_id as string,
    content: row.content as string,
    created_at: row.created_at as string,
    author,
  };
}

export async function getCommentsForPost(postId: string): Promise<Comment[]> {
  const { data: rows, error } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error || !rows?.length) {
    const profMap = new Map(SEED_PROFILES.map(p => [p.id, p]));
    return SEED_COMMENTS
      .filter(c => c.post_id === postId)
      .map(c => ({ ...c, author: profMap.get(c.author_id) }));
  }

  const authorIds = [...new Set(rows.map(r => r.author_id as string))];
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, bio, food_personality, created_at')
    .in('id', authorIds);

  if (pErr) throw new Error(pErr.message);

  const profileMap = new Map((profiles ?? []).map(p => [p.id, profileLiteFromRow(p)]));

  return rows.map(r => mapCommentRow(r as Record<string, unknown>, profileMap.get(r.author_id as string)));
}

export async function addComment(
  postId: string,
  content: string,
  authorId: string
): Promise<Comment> {
  const trimmed = sanitizeText(content, 280);
  if (!trimmed) throw new Error('Comment cannot be empty');
  if (trimmed.length > 280) throw new Error('Comment must be 280 characters or less');

  const { data: row, error } = await supabase
    .from('comments')
    .insert({ post_id: postId, author_id: authorId, content: trimmed })
    .select('*')
    .single();

  if (error) throw new Error(error.message);

  const { data: prof, error: pErr } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, bio, food_personality, created_at')
    .eq('id', authorId)
    .maybeSingle();

  if (pErr) throw new Error(pErr.message);

  return mapCommentRow(
    row as Record<string, unknown>,
    prof ? profileLiteFromRow(prof) : undefined,
  );
}

export async function deleteComment(commentId: string, currentUserId: string): Promise<void> {
  const { data, error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)
    .eq('author_id', currentUserId)
    .select('id')
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Comment not found or not authorized to delete this comment');
}
