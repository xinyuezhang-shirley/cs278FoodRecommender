interface TagProps {
  label: string;
  variant?: 'default' | 'matcha' | 'taro' | 'milk-tea' | 'strawberry' | 'nommi-free' | 'nommi-event' | 'nommi-rec';
  size?: 'xs' | 'sm';
}

const VARIANT_CLASSES = {
  default: 'bg-[#f5f3ef] text-[#6b7280]',
  'nommi-free': 'bg-[#eaf1ff] text-[#2f5fc4]',
  'nommi-event': 'bg-[#fff3dc] text-[#2f5fc4]',
  'nommi-rec': 'bg-[#f0f4ff] text-[#6f90d8]',
  matcha: 'bg-[#eaf1ff] text-[#2f5fc4]',
  taro: 'bg-[#f0ebff] text-[#4338ca]',
  'milk-tea': 'bg-[#fff3dc] text-[#92400e]',
  strawberry: 'bg-[#eaf1ff] text-[#6f90d8]',
};

const SIZE_CLASSES = {
  xs: 'px-1.5 py-0.5 text-[10px]',
  sm: 'px-2 py-1 text-xs',
};

export function Tag({ label, variant = 'default', size = 'xs' }: TagProps) {
  return (
    <span
      className={[
        'inline-flex items-center font-bold rounded-full border border-transparent',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
      ].join(' ')}
    >
      {label}
    </span>
  );
}

export function PostTypeBadge({ type }: { type: 'free_food' | 'recommendation' | 'event' }) {
  if (type === 'free_food') return <Tag label="Free Food" variant="nommi-free" />;
  if (type === 'event') return <Tag label="Event" variant="nommi-event" />;
  return null;
}
