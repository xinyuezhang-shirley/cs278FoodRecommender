interface NodeDef {
  label: string;
  x: number;
  y: number;
  color: string;
  size: number;
}

const NODES: NodeDef[] = [
  { label: 'Boba', x: 72, y: 36, color: '#9333ea', size: 22 },
  { label: 'Pizza', x: 160, y: 20, color: '#f59e0b', size: 20 },
  { label: 'Coffee', x: 230, y: 44, color: '#92400e', size: 22 },
  { label: 'Healthy', x: 248, y: 130, color: '#16a34a', size: 20 },
  { label: 'Free Food', x: 144, y: 158, color: '#f43f5e', size: 24 },
  { label: 'Ramen', x: 36, y: 118, color: '#ef4444', size: 18 },
];

const CENTER = { x: 148, y: 88, label: 'You', color: '#1a1a1a', size: 28 };

export function FoodIdentityGraph() {
  return (
    <div className="bg-white rounded-2xl p-4">
      <h3 className="text-sm font-semibold text-[#1a1a1a] mb-3">Food Identity</h3>
      <div className="flex items-center justify-center">
        <svg
          width="100%"
          viewBox="0 0 280 180"
          style={{ maxWidth: '280px' }}
          aria-label="Food identity network graph"
        >
          {/* Lines from center to each node */}
          {NODES.map(node => (
            <line
              key={`line-${node.label}`}
              x1={CENTER.x}
              y1={CENTER.y}
              x2={node.x}
              y2={node.y}
              stroke="#e5e7eb"
              strokeWidth="1.5"
              strokeDasharray="4,3"
            />
          ))}

          {/* Satellite nodes */}
          {NODES.map(node => (
            <g key={node.label}>
              <circle cx={node.x} cy={node.y} r={node.size} fill={node.color} opacity="0.12" />
              <circle cx={node.x} cy={node.y} r={node.size - 4} fill={node.color} opacity="0.25" />
              <circle cx={node.x} cy={node.y} r={node.size - 8} fill={node.color} />
              <text
                x={node.x}
                y={node.y + node.size + 10}
                textAnchor="middle"
                fontSize="8.5"
                fontWeight="600"
                fill="#374151"
                fontFamily="Inter, system-ui, sans-serif"
              >
                {node.label}
              </text>
            </g>
          ))}

          {/* Center "You" node */}
          <circle cx={CENTER.x} cy={CENTER.y} r={CENTER.size + 6} fill="#1a1a1a" opacity="0.06" />
          <circle cx={CENTER.x} cy={CENTER.y} r={CENTER.size} fill="#1a1a1a" />
          <text
            x={CENTER.x}
            y={CENTER.y + 4}
            textAnchor="middle"
            fontSize="10"
            fontWeight="700"
            fill="white"
            fontFamily="Inter, system-ui, sans-serif"
          >
            You
          </text>
        </svg>
      </div>
    </div>
  );
}
