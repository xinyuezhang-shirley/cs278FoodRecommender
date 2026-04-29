import type { Comment } from '../types';
import { getComments, saveComments, getProfileById } from './storageService';
import { generateId } from '../utils/helpers';
import { sanitizeText } from '../utils/sanitize';

function enrichComment(comment: Comment): Comment {
  return {
    ...comment,
    author: getProfileById(comment.author_id),
  };
}

export async function getCommentsForPost(postId: string): Promise<Comment[]> {
  const comments = getComments()
    .filter(c => c.post_id === postId)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  return comments.map(enrichComment);
}

export async function addComment(
  postId: string,
  content: string,
  authorId: string
): Promise<Comment> {
  const trimmed = sanitizeText(content, 280);
  if (!trimmed) throw new Error('Comment cannot be empty');
  if (trimmed.length > 280) throw new Error('Comment must be 280 characters or less');

  const comment: Comment = {
    id: generateId(),
    post_id: postId,
    author_id: authorId,
    content: trimmed,
    created_at: new Date().toISOString(),
  };

  const comments = getComments();
  comments.push(comment);
  saveComments(comments);
  return enrichComment(comment);
}

export async function deleteComment(commentId: string, currentUserId: string): Promise<void> {
  const comments = getComments();
  const comment = comments.find(c => c.id === commentId);
  if (!comment) throw new Error('Comment not found');
  if (comment.author_id !== currentUserId) throw new Error('Not authorized to delete this comment');
  saveComments(comments.filter(c => c.id !== commentId));
}
