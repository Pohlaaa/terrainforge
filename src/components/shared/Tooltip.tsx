import React, { useCallback, useEffect, useId, useRef, useState } from 'react';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: React.ReactNode;
  position?: TooltipPosition;
  children: React.ReactNode;
}

const ARROW_SIZE = 6;

function getPositionStyles(
  pos: TooltipPosition,
  triggerRect: DOMRect,
  tooltipRect: DOMRect,
): React.CSSProperties {
  const gap = ARROW_SIZE + 4;
  let top = 0;
  let left = 0;

  switch (pos) {
    case 'top':
      top = triggerRect.top - tooltipRect.height - gap;
      left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
      break;
    case 'bottom':
      top = triggerRect.bottom + gap;
      left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
      break;
    case 'left':
      top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
      left = triggerRect.left - tooltipRect.width - gap;
      break;
    case 'right':
      top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
      left = triggerRect.right + gap;
      break;
  }

  // Clamp to viewport
  left = Math.max(8, Math.min(left, window.innerWidth - tooltipRect.width - 8));
  top = Math.max(8, Math.min(top, window.innerHeight - tooltipRect.height - 8));

  return { position: 'fixed', top, left };
}

function getArrowStyles(pos: TooltipPosition): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 0,
    height: 0,
    borderStyle: 'solid',
  };
  const sz = ARROW_SIZE;
  switch (pos) {
    case 'top':
      return {
        ...base,
        bottom: -sz,
        left: '50%',
        transform: 'translateX(-50%)',
        borderWidth: `${sz}px ${sz}px 0 ${sz}px`,
        borderColor: 'var(--surface3) transparent transparent transparent',
      };
    case 'bottom':
      return {
        ...base,
        top: -sz,
        left: '50%',
        transform: 'translateX(-50%)',
        borderWidth: `0 ${sz}px ${sz}px ${sz}px`,
        borderColor: 'transparent transparent var(--surface3) transparent',
      };
    case 'left':
      return {
        ...base,
        right: -sz,
        top: '50%',
        transform: 'translateY(-50%)',
        borderWidth: `${sz}px 0 ${sz}px ${sz}px`,
        borderColor: 'transparent transparent transparent var(--surface3)',
      };
    case 'right':
      return {
        ...base,
        left: -sz,
        top: '50%',
        transform: 'translateY(-50%)',
        borderWidth: `${sz}px ${sz}px ${sz}px 0`,
        borderColor: 'transparent var(--surface3) transparent transparent',
      };
  }
}

const TRANSFORM_ORIGIN: Record<TooltipPosition, string> = {
  top: 'translateY(4px)',
  bottom: 'translateY(-4px)',
  left: 'translateX(4px)',
  right: 'translateX(-4px)',
};

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  position = 'top',
  children,
}) => {
  const tooltipId = useId();
  const [visible, setVisible] = useState(false);
  const [posStyles, setPosStyles] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>();
  const isTouchDevice = useRef(false);

  const show = useCallback(() => {
    setVisible(true);
  }, []);

  const hide = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setVisible(false);
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (isTouchDevice.current) return;
    hoverTimer.current = setTimeout(show, 200);
  }, [show]);

  const handleMouseLeave = useCallback(() => {
    hide();
  }, [hide]);

  const handleTouchStart = useCallback(() => {
    isTouchDevice.current = true;
    setVisible((v) => !v);
  }, []);

  // Position tooltip after it becomes visible
  useEffect(() => {
    if (!visible || !triggerRef.current || !tooltipRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    setPosStyles(getPositionStyles(position, triggerRect, tooltipRect));
  }, [visible, position]);

  // Dismiss on outside click (mobile)
  useEffect(() => {
    if (!visible) return;
    const handleClick = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node)
      ) {
        hide();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [visible, hide]);

  // Dismiss on Escape
  useEffect(() => {
    if (!visible) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [visible, hide]);

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        aria-describedby={visible ? tooltipId : undefined}
        style={{ display: 'inline-flex', alignItems: 'center' }}
      >
        {children}
      </span>
      {visible && (
        <div
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          style={{
            ...posStyles,
            zIndex: 50,
            maxWidth: 240,
            padding: '8px 12px',
            fontSize: '13px',
            lineHeight: 1.5,
            color: 'var(--text)',
            background: 'var(--surface3)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md, 8px)',
            pointerEvents: 'none',
            opacity: posStyles.top !== undefined ? 1 : 0,
            transform: posStyles.top !== undefined ? 'none' : TRANSFORM_ORIGIN[position],
            transition: reducedMotion ? 'none' : 'opacity 150ms ease-out, transform 150ms ease-out',
          }}
        >
          <div style={getArrowStyles(position)} />
          {content}
        </div>
      )}
    </>
  );
};

interface HelpIconProps {
  tooltip: string;
  position?: TooltipPosition;
}

export const HelpIcon: React.FC<HelpIconProps> = ({
  tooltip,
  position = 'top',
}) => {
  return (
    <Tooltip content={tooltip} position={position}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 20,
          height: 20,
          borderRadius: '50%',
          border: '1px solid var(--text-3)',
          color: 'var(--text-3)',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'help',
          marginLeft: 8,
          flexShrink: 0,
        }}
      >
        ?
      </span>
    </Tooltip>
  );
};

export default Tooltip;
