import { useEffect, useRef, useState } from 'react';

interface UseCountUpOptions {
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export function useCountUp({
  end,
  duration = 600,
  prefix = '',
  suffix = '',
  decimals = 0,
}: UseCountUpOptions): string {
  const [display, setDisplay] = useState(`${prefix}${(0).toFixed(decimals)}${suffix}`);
  const prevEnd = useRef(end);
  const rafId = useRef<number>();

  useEffect(() => {
    const startVal = prevEnd.current;
    prevEnd.current = end;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (end - startVal) * eased;
      setDisplay(`${prefix}${current.toFixed(decimals)}${suffix}`);
      if (progress < 1) {
        rafId.current = requestAnimationFrame(tick);
      }
    }
    rafId.current = requestAnimationFrame(tick);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [end, duration, prefix, suffix, decimals]);

  return display;
}
