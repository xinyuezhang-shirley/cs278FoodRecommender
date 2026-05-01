import React from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'matcha' | 'taro';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<Exclude<Variant, 'primary'>, string> = {
  secondary: 'rounded-full bg-white text-[#2f5fc4] border border-[#e5e7eb] font-bold hover:bg-[#faf9f5] active:bg-[#f5f3ef]',
  ghost: 'bg-transparent text-[#6b7280] hover:bg-[#f5f3ef] active:bg-[#e5e7eb]',
  danger: 'bg-red-50 text-red-600 hover:bg-red-100 active:bg-red-200',
  matcha: 'bg-[#f0fdf4] text-[#16a34a] hover:bg-[#dcfce7] active:bg-[#bbf7d0]',
  taro: 'bg-[#faf5ff] text-[#9333ea] hover:bg-[#f3e8ff] active:bg-[#e9d5ff]',
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs font-medium rounded-full gap-1.5',
  md: 'px-4 py-2 text-sm font-medium rounded-full gap-2',
  lg: 'px-6 py-3 text-base font-semibold rounded-full gap-2',
};

const PRIMARY_SIZE_PADDING: Record<Size, string> = {
  sm: 'px-4 py-1.5 text-xs gap-1.5',
  md: 'px-5 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2',
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
  const primaryClasses = [
    PRIMARY_SIZE_PADDING[size],
    'rounded-full bg-linear-to-r from-[#2f5fc4] to-[#6f90d8] text-white font-black tracking-wide shadow-[0_10px_24px_rgba(47,95,196,0.24)] transition active:scale-95',
    'disabled:active:scale-100',
    fullWidth ? 'w-full' : '',
    className,
  ].filter(Boolean).join(' ');

  const nonPrimaryClasses =
    variant !== 'primary'
      ? [VARIANT_CLASSES[variant], SIZE_CLASSES[size], fullWidth ? 'w-full' : '', className].filter(Boolean).join(' ')
      : '';

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center transition-colors duration-150',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variant === 'primary' ? primaryClasses : nonPrimaryClasses,
      ].join(' ')}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : children}
    </button>
  );
}
