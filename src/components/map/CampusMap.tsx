import { useState } from 'react';
import type { Post } from '../../types';
import { isExpired } from '../../utils/helpers';

interface CampusMapProps {
  posts: Post[];
  onPinClick: (post: Post) => void;
}

// Normalize Stanford GPS coords to SVG viewport (0-400 x 0-300)
function geoToSvg(lat: number, lng: number): [number, number] {
  // Stanford rough bounds: lat 37.418-37.436, lng -122.180 to -122.158
  const latMin = 37.418, latMax = 37.436;
  const lngMin = -122.180, lngMax = -122.158;
  const x = ((lng - lngMin) / (lngMax - lngMin)) * 380 + 10;
  const y = ((latMax - lat) / (latMax - latMin)) * 260 + 20;
  return [x, y];
}

function getPinColor(post: Post): string {
  if (post.type === 'free_food') return isExpired(post.expires_at) ? '#9ca3af' : '#16a34a';
  if (post.type === 'event') return '#9333ea';
  return '#f59e0b';
}

// Campus buildings for the SVG background
const BUILDINGS = [
  { name: 'Main Quad', x: 168, y: 118, w: 64, h: 44 },
  { name: 'Green Library', x: 150, y: 86, w: 36, h: 28 },
  { name: 'Tresidder', x: 148, y: 172, w: 36, h: 24 },
  { name: 'Hoover Tower', x: 128, y: 108, w: 18, h: 18 },
  { name: 'Gates', x: 258, y: 126, w: 38, h: 30 },
  { name: 'Huang', x: 260, y: 158, w: 30, h: 22 },
  { name: 'Arrillaga', x: 84, y: 194, w: 48, h: 28 },
  { name: 'EVGR', x: 295, y: 88, w: 40, h: 28 },
  { name: 'Cantor Arts', x: 92, y: 108, w: 36, h: 26 },
];

const ROADS = [
  // Palm Drive (main entrance, south to main quad)
  'M200,290 L200,240 L200,210',
  // Campus Drive loop (simplified oval)
  'M60,160 Q60,60 200,50 Q340,60 340,160 Q340,250 200,260 Q60,250 60,160',
  // Inner road - past Gates to Huang
  'M200,140 L260,140 L260,160',
  // Road past Green Library
  'M168,86 L168,140',
  // Road to Arrillaga
  'M168,172 L168,200 L110,200',
  // Road to EVGR
  'M296,120 L260,130',
];

export function CampusMap({ posts, onPinClick }: CampusMapProps) {
  const [tooltip, setTooltip] = useState<string | null>(null);

  // Group posts by location — pick latest per unique location coord
  const postsWithCoords = posts.filter(p => p.latitude != null && p.longitude != null);

  // Deduplicate pins that are very close together, showing count
  const pinGroups: Map<string, Post[]> = new Map();
  for (const post of postsWithCoords) {
    const [svgX, svgY] = geoToSvg(post.latitude!, post.longitude!);
    const key = `${Math.round(svgX / 12)},${Math.round(svgY / 12)}`;
    if (!pinGroups.has(key)) pinGroups.set(key, []);
    pinGroups.get(key)!.push(post);
  }

  return (
    <div className="relative w-full bg-white rounded-2xl overflow-hidden shadow-sm border border-[#e5e7eb]">
      <svg
        viewBox="0 0 400 300"
        className="w-full"
        style={{ maxHeight: '420px' }}
        role="img"
        aria-label="Stanford campus map"
      >
        {/* Background */}
        <rect width="400" height="300" fill="#f1f5e8" />

        {/* Campus boundary */}
        <ellipse cx="200" cy="155" rx="160" ry="130" fill="#e8eed8" stroke="#c9d4a8" strokeWidth="1.5" />

        {/* Roads */}
        {ROADS.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke="#d9d5ca"
            strokeWidth={i === 0 ? 6 : 4}
            strokeLinecap="round"
          />
        ))}

        {/* Buildings */}
        {BUILDINGS.map(b => (
          <g key={b.name}>
            <rect
              x={b.x}
              y={b.y}
              width={b.w}
              height={b.h}
              rx="3"
              fill="#e5e0d4"
              stroke="#c9c4b8"
              strokeWidth="1"
            />
            <text
              x={b.x + b.w / 2}
              y={b.y + b.h + 9}
              textAnchor="middle"
              fontSize="6"
              fill="#888"
              fontFamily="Inter, system-ui, sans-serif"
            >
              {b.name}
            </text>
          </g>
        ))}

        {/* Memorial Church cross indicator */}
        <text x="196" y="145" textAnchor="middle" fontSize="11" fill="#b8a898">✝</text>

        {/* North indicator */}
        <g transform="translate(372,28)">
          <circle cx="0" cy="0" r="12" fill="white" stroke="#e5e7eb" strokeWidth="1" />
          <text x="0" y="4" textAnchor="middle" fontSize="10" fontWeight="600" fill="#6b7280" fontFamily="Inter, sans-serif">N</text>
        </g>

        {/* Food pins */}
        {Array.from(pinGroups.entries()).map(([key, group]) => {
          const lead = group[0];
          const [x, y] = geoToSvg(lead.latitude!, lead.longitude!);
          const color = getPinColor(lead);
          const count = group.length;
          const radius = count > 1 ? 10 : 8;

          return (
            <g
              key={key}
              transform={`translate(${x},${y})`}
              onClick={() => onPinClick(lead)}
              onMouseEnter={() => setTooltip(lead.title)}
              onMouseLeave={() => setTooltip(null)}
              style={{ cursor: 'pointer' }}
              role="button"
              aria-label={lead.title}
            >
              {/* Shadow */}
              <circle cx="1" cy="2" r={radius + 1} fill="rgba(0,0,0,0.15)" />
              {/* Pin body */}
              <circle cx="0" cy="0" r={radius} fill={color} />
              {/* Count or icon */}
              {count > 1 ? (
                <text
                  x="0" y="4"
                  textAnchor="middle"
                  fontSize="8"
                  fontWeight="700"
                  fill="white"
                  fontFamily="Inter, sans-serif"
                >
                  {count}
                </text>
              ) : (
                <text
                  x="0" y="4"
                  textAnchor="middle"
                  fontSize="8"
                  fill="white"
                  fontFamily="system-ui, sans-serif"
                >
                  {lead.type === 'free_food' ? '🍕' : lead.type === 'event' ? '🎉' : '⭐'}
                </text>
              )}
              {/* Pulse ring for active free food */}
              {lead.type === 'free_food' && !isExpired(lead.expires_at) && (
                <circle cx="0" cy="0" r={radius + 3} fill="none" stroke={color} strokeWidth="1.5" opacity="0.4" />
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 flex gap-3 text-[10px] font-medium shadow-sm">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#16a34a] inline-block" />
          Free
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] inline-block" />
          Rec
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#9333ea] inline-block" />
          Event
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#9ca3af] inline-block" />
          Expired
        </span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-[#1a1a1a] text-white text-xs px-3 py-1.5 rounded-full max-w-48 text-center shadow-lg pointer-events-none">
          {tooltip}
        </div>
      )}
    </div>
  );
}
