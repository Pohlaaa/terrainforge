import React, { useEffect, useRef, useState } from 'react';
import type { ToastData } from '@/hooks/useToast';
import { useToasts, useRemoveToast } from '@/hooks/useToast';

interface ToastItemProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

const BORDER_COLORS: Record<string, string> = {
  success: 'var(--status-success)',
  error: 'var(--status-error)',
  info: 'var(--status-info)',
  warning: 'var(--status-warning)',
};

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const dismiss = () => {
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), 200);
  };

  useEffect(() => {
    const duration = toast.duration ?? 4000;
    timerRef.current = setTimeout(dismiss, duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className={`${exiting ? 'animate-toast-out' : 'animate-toast-in'} ${
        toast.type === 'error' ? 'animate-error-shake' : ''
      }`}
      style={{
        minWidth: '300px',
        maxWidth: '400px',
        padding: '14px 16px',
        borderRadius: '10px',
        boxShadow: 'var(--shadow-lg, var(--shadow-panel))',
        background: 'var(--surface-card)',
        borderLeft: `4px solid ${BORDER_COLORS[toast.type] ?? 'var(--color-primary)'}`,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
      }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: toast.message ? '4px' : 0,
          }}
        >
          {toast.title}
        </div>
        {toast.message && (
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {toast.message}
          </div>
        )}
      </div>
      <button
        onClick={dismiss}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-tertiary)',
          fontSize: '16px',
          minWidth: '44px',
          minHeight: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '4px',
          flexShrink: 0,
        }}
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const toasts = useToasts();
  const removeToast = useRemoveToast();

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 60,
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: '8px',
      }}
      role="region"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={removeToast} />
      ))}
    </div>
  );
};

export default ToastContainer;
