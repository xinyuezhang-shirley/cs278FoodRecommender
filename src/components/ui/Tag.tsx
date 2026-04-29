interface TagProps {
  label: string;
  variant?: 'default' | 'matcha' | 'taro' | 'milk-tea' | 'strawberry';
  size?: 'xs' | 'sm';
}

const VARIANT_CLASSES = {
  default: 'bg-[#f3f4f6] text-[#4b5563]',
  matcha: 'bg-[#f0fdf4] text-[#16a34a]',
  taro: 'bg-[#faf5ff] text-[#9333ea]',
  'milk-tea': 'bg-[#fffbeb] text-[#92400e]',
  strawberry: 'bg-[#fff1f2] text-[#f43f5e]',
};

const SIZE_CLASSES = {
  xs: 'px-1.5 py-0.5 text-[10px]',
  sm: 'px-2 py-1 text-xs',
};

export function Tag({ label, variant = 'default', size = 'xs' }: TagProps) {
  return (
    <span
      className={[
        'inline-flex items-center font-medium rounded-full',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
      ].join(' ')}
    >
      {label}
    </span>
  );
}

export function PostTypeBadge({ type }: { type: 'free_food' | 'recommendation' | 'event' }) {
  if (type === 'free_food') return <Tag label="Free Food" variant="matcha" />;
  if (type === 'event') return <Tag label="Event" variant="taro" />;
  return null;
}
