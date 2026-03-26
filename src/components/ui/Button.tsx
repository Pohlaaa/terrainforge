import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'xs';
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  icon,
  className = '',
  ...props
}) => {
  const variantClasses = {
    primary: 'bg-[var(--green)] text-white hover:bg-[#3a8a65]',
    secondary: 'bg-transparent border border-[var(--border2)] text-[var(--text-2)] hover:border-[var(--green-l)] hover:text-[var(--text)]',
    danger: 'bg-[rgba(220,38,38,.15)] border border-[var(--red)] text-[var(--red-l)] hover:bg-[rgba(220,38,38,.25)]',
    ghost: 'bg-transparent border-none text-[var(--text-3)] hover:text-[var(--text)]',
    outline: 'bg-transparent border-2 border-[var(--border)] text-[var(--text-2)] hover:border-[var(--green-l)]',
  };

  const sizeClasses = {
    xs: 'px-[9px] py-[4px] text-[11px] rounded-[6px]',
    sm: 'px-[12px] py-[6px] text-[12px]',
    md: 'px-[18px] py-[9px] text-[13px]',
    lg: 'px-[24px] py-[12px] text-[14px]',
  };

  return (
    <button
      className={`inline-flex items-center gap-[7px] rounded-[8px] font-[600] border-none transition-all duration-200 cursor-pointer ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
};

export default Button;
