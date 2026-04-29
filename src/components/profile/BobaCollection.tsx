interface Boba {
  name: string;
  emoji: string;
  label: string;
  color: string;
  unlocked: boolean;
}

interface BobaCollectionProps {
  postCount: number;
  freeFoodCount: number;
  circleCount: number;
}

export function BobaCollection({ postCount, freeFoodCount, circleCount }: BobaCollectionProps) {
  const bobas: Boba[] = [
    {
      name: 'Matcha',
      emoji: '🟢',
      label: 'Healthy Eater',
      color: '#16a34a',
      unlocked: postCount >= 1,
    },
    {
      name: 'Taro',
      emoji: '🟣',
      label: 'Free Food Pro',
      color: '#9333ea',
      unlocked: freeFoodCount >= 3,
    },
    {
      name: 'Brown Sugar',
      emoji: '🟤',
      label: 'Popular Posts',
      color: '#92400e',
      unlocked: postCount >= 5,
    },
    {
      name: 'Strawberry',
      emoji: '🔴',
      label: 'Social Butterfly',
      color: '#f43f5e',
      unlocked: circleCount >= 2,
    },
  ];

  return (
    <div className="bg-white rounded-2xl p-4">
      <h3 className="text-sm font-semibold text-[#1a1a1a] mb-3">Boba Collection</h3>
      <div className="grid grid-cols-4 gap-2">
        {bobas.map(boba => (
          <div key={boba.name} className="flex flex-col items-center gap-1">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-2xl relative"
              style={{
                background: boba.unlocked
                  ? `radial-gradient(circle at 35% 35%, white 0%, ${boba.color}33 60%, ${boba.color}66 100%)`
                  : '#f3f4f6',
                border: boba.unlocked ? `2px solid ${boba.color}` : '2px solid #e5e7eb',
              }}
            >
              <BobaCup color={boba.unlocked ? boba.color : '#d1d5db'} />
              {!boba.unlocked && (
                <div className="absolute inset-0 rounded-full bg-white/70 flex items-center justify-center">
                  <span className="text-xs text-[#9ca3af]">🔒</span>
                </div>
              )}
            </div>
            <span className="text-[10px] font-semibold text-[#1a1a1a]">{boba.name}</span>
            <span className="text-[9px] text-[#6b7280] text-center leading-tight">{boba.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BobaCup({ color }: { color: string }) {
  return (
    <svg width="28" height="32" viewBox="0 0 28 32" fill="none">
      {/* Straw */}
      <rect x="13" y="0" width="2.5" height="10" rx="1.2" fill={color} opacity="0.8" />
      {/* Lid */}
      <rect x="5" y="8" width="18" height="3.5" rx="1.5" fill={color} opacity="0.9" />
      {/* Cup body */}
      <path d="M7,11.5 L9,28 Q9,30 14,30 Q19,30 19,28 L21,11.5 Z" fill={color} opacity="0.3" />
      <path d="M7,11.5 L9,28 Q9,30 14,30 Q19,30 19,28 L21,11.5 Z" stroke={color} strokeWidth="1.5" fill="none" />
      {/* Boba pearls */}
      <circle cx="11" cy="24" r="2" fill={color} opacity="0.7" />
      <circle cx="14" cy="22" r="2" fill={color} opacity="0.7" />
      <circle cx="17" cy="24" r="2" fill={color} opacity="0.7" />
    </svg>
  );
}
