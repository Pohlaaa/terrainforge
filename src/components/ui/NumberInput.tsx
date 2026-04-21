import React, { forwardRef, useCallback } from 'react';

/**
 * F-040: numeric input that actually behaves like a number input should.
 *
 * Two UX fixes contractors asked for repeatedly in V4 and V5:
 *   - A `0` value renders as empty so the user can just start typing instead
 *     of having to backspace-delete the 0 first.
 *   - Clicking (or tab-focusing) any pre-populated value selects the whole
 *     string so the next keystroke replaces it cleanly. Matches the pattern
 *     every spreadsheet and finance app uses.
 *
 * Value semantics: pass a `number | null` (null = blank). The onChange
 * callback fires with `number | null` as well (empty string → null; any
 * parseable number → that number). Keeps call sites from sprinkling
 * parseFloat + NaN handling everywhere.
 */
export interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  /** Whether to select all contents on focus. Default true. Set false for read-only previews. */
  selectOnFocus?: boolean;
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  { value, onChange, selectOnFocus = true, onFocus, onBlur, onKeyDown, ...rest },
  ref,
) {
  // Render 0 / null / undefined as empty string; any other number as its string form.
  // This is the "zero disappears" fix.
  const displayValue =
    value === null || value === undefined || value === 0 || Number.isNaN(value)
      ? ''
      : String(value);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      if (raw === '' || raw === '-') {
        onChange(null);
        return;
      }
      const parsed = parseFloat(raw);
      onChange(Number.isNaN(parsed) ? null : parsed);
    },
    [onChange],
  );

  const handleFocus = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      if (selectOnFocus) {
        // Defer to next tick — some browsers reset selection after focus.
        const target = e.currentTarget;
        requestAnimationFrame(() => {
          try {
            target.select();
          } catch {
            /* noop — target may have unmounted */
          }
        });
      }
      onFocus?.(e);
    },
    [selectOnFocus, onFocus],
  );

  return (
    <input
      ref={ref}
      type="number"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      {...rest}
    />
  );
});

export default NumberInput;
