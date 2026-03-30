import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  className = '',
  ...props
}) => {
  return (
    <div className="flex flex-col gap-[5px]">
      {label && (
        <label className="text-[11px] font-[700] text-[var(--text-3)] uppercase tracking-[0.04em]">
          {label}
          {props.required && <span className="text-[var(--red-l)] ml-[2px]">*</span>}
        </label>
      )}
      <input
        className={`bg-[var(--surface3)] border border-[var(--border)] rounded-[8px] text-[var(--text)] px-[12px] py-[9px] text-[13px] outline-none transition-all duration-200 focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-opacity-30 w-full ${className}`}
        {...props}
      />
      {hint && <div className="text-[11px] text-[var(--text-4)] mt-[3px]">{hint}</div>}
      {error && <div className="text-[11px] text-[var(--red-l)] mt-[3px]">{error}</div>}
    </div>
  );
};

export default Input;
