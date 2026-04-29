import React from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'matcha' | 'taro';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-[#f43f5e] text-white hover:bg-[#e11d48] active:bg-[#be123c]',
  secondary: 'bg-white text-[#1a1a1a] border border-[#e5e7eb] hover:bg-[#f9fafb] active:bg-[#f3f4f6]',
  ghost: 'bg-transparent text-[#6b7280] hover:bg-[#f3f4f6] active:bg-[#e5e7eb]',
  danger: 'bg-red-50 text-red-600 hover:bg-red-100 active:bg-red-200',
  matcha: 'bg-[#f0fdf4] text-[#16a34a] hover:bg-[#dcfce7] active:bg-[#bbf7d0]',
  taro: 'bg-[#faf5ff] text-[#9333ea] hover:bg-[#f3e8ff] active:bg-[#e9d5ff]',
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs font-medium rounded-lg gap-1.5',
  md: 'px-4 py-2 text-sm font-medium rounded-xl gap-2',
  lg: 'px-6 py-3 text-base font-semibold rounded-xl gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center transition-colors duration-150',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth ? 'w-full' : '',
        className,
      ].filter(Boolean).join(' ')}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : children}
    </button>
  );
}
