import React from 'react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  className = '',
  ...props
}) => {
  return (
    <div className="flex items-center gap-[8px]">
      <input
        type="checkbox"
        className={`w-[16px] h-[16px] cursor-pointer accent-[var(--green)] ${className}`}
        {...props}
      />
      {label && (
        <label className="text-[13px] text-[var(--text-2)] cursor-pointer">
          {label}
        </label>
      )}
    </div>
  );
};

export default Checkbox;
