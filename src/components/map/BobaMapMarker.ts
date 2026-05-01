import L from 'leaflet';
import type { PostType } from '../../types';

export type MarkerVariant = PostType | 'expired';

const PALETTE: Record<MarkerVariant, { bg: string; ring: string; ink: string }> = {
  free_food:       { bg: '#fff3dc', ring: '#2f5fc4', ink: '#2f5fc4' },
  recommendation: { bg: '#eaf1ff', ring: '#6f90d8', ink: '#2f5fc4' },
  event:          { bg: '#f0ebff', ring: '#6f90d8', ink: '#4338ca' },
  expired:        { bg: '#f5f3ef', ring: '#d1d5db', ink: '#6b7280' },
};

/** One post = small dot; 2–3 = medium + count; 4+ = larger + count. */
function placeTierRadius(postCount: number): { r: number; showCount: boolean } {
  if (postCount <= 1) return { r: 12, showCount: false };
  if (postCount <= 3) return { r: 16, showCount: true };
  return { r: 22, showCount: true };
}

/** Marker for a place (location group), not a single post. */
export function createPlaceBobaIcon(variant: MarkerVariant, placePostCount: number): L.DivIcon {
  const { bg, ink } = PALETTE[variant] ?? PALETTE.expired;
  const { r, showCount } = placeTierRadius(placePostCount);
  const size = r * 2 + 4;
  const cx = size / 2;
  const cy = size / 2;

  const inner = showCount
    ? `<circle cx="${cx}" cy="${cy}" r="${r * 0.46}" fill="rgba(47,95,196,0.18)"/>
       <text x="${cx}" y="${cy + 1}" text-anchor="middle" dominant-baseline="middle"
             fill="${ink}" font-weight="900" font-size="${Math.max(r * 0.45, 9)}"
             font-family="Inter,system-ui,sans-serif">${placePostCount}</text>`
    : `<circle cx="${cx}" cy="${cy}" r="${r * 0.22}" fill="${ink}" opacity="0.45"/>`;

  const html = `<svg width="${size}" height="${size + 6}" viewBox="0 0 ${size} ${size + 6}" fill="none"
      xmlns="http://www.w3.org/2000/svg" style="overflow:visible;display:block">
    <ellipse cx="${cx}" cy="${size + 3}" rx="${r * 0.62}" ry="3"
             fill="rgba(47,95,196,0.15)"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${bg}"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" stroke="white" stroke-width="2.5"/>
    <circle cx="${cx * 0.66}" cy="${cy * 0.6}" r="${r * 0.3}" fill="white" opacity="0.5"/>
    ${inner}
  </svg>`;

  return L.divIcon({
    html,
    className: '',
    iconSize: [size, size + 6],
    iconAnchor: [cx, size + 6],
    popupAnchor: [0, -(size + 8)],
  });
}

/** @deprecated use createPlaceBobaIcon for map places */
export function createBobaIcon(variant: MarkerVariant, count = 1): L.DivIcon {
  return createPlaceBobaIcon(variant, count);
}
