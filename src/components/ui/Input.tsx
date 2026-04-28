import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  hint,
  className = '',
  ...props
}, ref) => {
  return (
    <div className="flex flex-col gap-[5px]">
      {label && (
        <label className="text-[11px] font-[700] text-[var(--text-3)] uppercase tracking-[0.04em]">
          {label}
          {props.required && <span className="text-[var(--red-l)] ml-[2px]">*</span>}
        </label>
      )}
      {hint && <div className="text-[12px] text-[var(--text-3)] mt-[2px] mb-[4px]">{hint}</div>}
      <input
        ref={ref}
        className={`bg-[var(--surface3)] border border-[var(--border)] rounded-[8px] text-[var(--text)] px-[12px] py-[9px] text-[13px] outline-none transition-all duration-200 focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-opacity-30 w-full ${className}`}
        {...props}
        // X-7: select-all on focus for numeric inputs so contractors don't
        // have to delete a leading 0 before typing their value. Spread
        // BEFORE this so consumer-provided onFocus still chains via the
        // wrapper below.
        onFocus={(e) => {
          if (props.type === 'number') e.currentTarget.select()
          props.onFocus?.(e)
        }}
      />
      {error && <div className="text-[11px] text-[var(--red-l)] mt-[3px]">{error}</div>}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
