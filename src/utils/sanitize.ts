const ALLOWED_CHARS = /[<>&"']/g;
const ESCAPE_MAP: Record<string, string> = {
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  '"': '&quot;',
  "'": '&#x27;',
};

export function escapeHtml(str: string): string {
  return str.replace(ALLOWED_CHARS, c => ESCAPE_MAP[c] ?? c);
}

export function sanitizeText(input: string, maxLength?: number): string {
  let result = input.trim();
  if (maxLength) result = result.slice(0, maxLength);
  return result;
}

export function sanitizeTags(tags: string[]): string[] {
  return tags
    .map(t => t.trim().toLowerCase().replace(/[^a-z0-9-\s]/g, '').slice(0, 30))
    .filter(Boolean)
    .slice(0, 10);
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters';
  return null;
}

export function validateUsername(username: string): string | null {
  if (username.length < 2) return 'Username must be at least 2 characters';
  if (username.length > 30) return 'Username must be 30 characters or less';
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Username can only contain letters, numbers, and underscores';
  return null;
}
