import { formatDistanceToNow, format, isPast } from 'date-fns';

export function timeAgo(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return '';
  }
}

export function timeRemaining(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isPast(date)) return 'Expired';
    return formatDistanceToNow(date) + ' left';
  } catch {
    return '';
  }
}

export function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'MMM d, h:mm a');
  } catch {
    return '';
  }
}

export function isExpired(dateStr?: string): boolean {
  if (!dateStr) return false;
  return isPast(new Date(dateStr));
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getInitials(username: string): string {
  return username
    .split(/[\s_-]/)
    .map(w => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');
}

export function getAvatarColor(username: string): string {
  const colors = [
    '#f43f5e', '#9333ea', '#16a34a', '#d97706',
    '#0ea5e9', '#ec4899', '#84cc16', '#f59e0b',
  ];
  const idx = username.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;
  return colors[idx];
}

export const CUISINE_OPTIONS = [
  'boba', 'ramen', 'sushi', 'pizza', 'coffee', 'sandwiches',
  'salad', 'tacos', 'burgers', 'dim sum', 'thai', 'korean', 'indian', 'mediterranean',
];

export const DIETARY_OPTIONS = [
  'vegan', 'vegetarian', 'halal', 'kosher', 'gluten-free', 'dairy-free', 'nut-free',
];

export const CAMPUS_LOCATIONS: { name: string; lat: number; lng: number }[] = [
  { name: 'Huang Basement', lat: 37.4276, lng: -122.1730 },
  { name: 'CoHo Cafe', lat: 37.4255, lng: -122.1710 },
  { name: 'Arrillaga', lat: 37.4243, lng: -122.1685 },
  { name: 'EVGR', lat: 37.4312, lng: -122.1725 },
  { name: 'Gates', lat: 37.4300, lng: -122.1733 },
  { name: 'Green Library', lat: 37.4265, lng: -122.1672 },
  { name: 'Tresidder', lat: 37.4250, lng: -122.1710 },
  { name: 'Main Quad', lat: 37.4270, lng: -122.1682 },
  { name: 'Cantor Arts Center', lat: 37.4318, lng: -122.1700 },
  { name: 'Bing Concert Hall', lat: 37.4294, lng: -122.1659 },
];

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// --- Geo helpers ---

export function haversineDistanceMiles(
  [lat1, lon1]: [number, number],
  [lat2, lon2]: [number, number]
): number {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(miles: number): string {
  if (miles < 0.08) return 'Here';
  if (miles < 0.35) return `${Math.round(miles * 20)} min walk`;
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

// Max miles for each distance option value
export const DISTANCE_MAX_MILES: Record<string, number> = {
  '5min':  0.25,
  '10min': 0.5,
  '15min': 0.75,
  '0.5mi': 0.5,
  '1mi':   1,
  '3mi':   3,
  '5mi':   5,
};
