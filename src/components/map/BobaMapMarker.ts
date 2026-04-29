import L from 'leaflet';
import type { PostType } from '../../types';

export type MarkerVariant = PostType | 'expired';

const PALETTE: Record<MarkerVariant, { bg: string; ring: string; ink: string }> = {
  free_food:      { bg: '#86efac', ring: '#16a34a', ink: '#14532d' },
  recommendation: { bg: '#fde68a', ring: '#d97706', ink: '#7c2d12' },
  event:          { bg: '#c4b5fd', ring: '#7c3aed', ink: '#4c1d95' },
  expired:        { bg: '#e5e7eb', ring: '#9ca3af', ink: '#6b7280' },
};

export function createBobaIcon(variant: MarkerVariant, count = 1): L.DivIcon {
  const { bg, ink } = PALETTE[variant] ?? PALETTE.expired;

  // Radius scales with post count (min 14, max 26)
  const r = Math.min(14 + Math.floor((count - 1) * 2.5), 26);
  const size = r * 2 + 4;
  const cx = size / 2;
  const cy = size / 2;

  const inner =
    count > 1
      ? `<circle cx="${cx}" cy="${cy}" r="${r * 0.46}" fill="rgba(0,0,0,0.16)"/>
         <text x="${cx}" y="${cy + 1}" text-anchor="middle" dominant-baseline="middle"
               fill="white" font-weight="900" font-size="${Math.max(r * 0.52, 8)}"
               font-family="Inter,system-ui,sans-serif">${count}</text>`
      : `<circle cx="${cx}" cy="${cy}" r="${r * 0.22}" fill="${ink}" opacity="0.38"/>`;

  const html = `<svg width="${size}" height="${size + 6}" viewBox="0 0 ${size} ${size + 6}" fill="none"
      xmlns="http://www.w3.org/2000/svg" style="overflow:visible;display:block">
    <ellipse cx="${cx}" cy="${size + 3}" rx="${r * 0.62}" ry="3"
             fill="rgba(0,0,0,0.12)"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${bg}"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" stroke="white" stroke-width="2.5"/>
    <circle cx="${cx * 0.66}" cy="${cy * 0.6}" r="${r * 0.3}" fill="white" opacity="0.44"/>
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
