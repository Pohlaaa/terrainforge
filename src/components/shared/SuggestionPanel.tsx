import React from 'react';

export interface SuggestionItem {
  id: string;
  title: string;
  subtitle?: string;
  reason: string;
  warning?: string;
  metadata?: Record<string, string | number>;
}

interface SuggestionPanelProps {
  title: string;
  items: SuggestionItem[];
  onAccept: (id: string) => void;
  onDismiss: (id: string) => void;
  onAcceptAll: () => void;
  onDismissAll: () => void;
  acceptedIds: Set<string>;
  dismissedIds: Set<string>;
  isLoading?: boolean;
  emptyMessage?: string;
}

function SkeletonCard() {
  return (
    <div
      className="rounded-[8px] border p-[14px] animate-pulse"
      style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-start gap-[10px]">
        <div className="flex-1 space-y-[8px]">
          <div
            className="h-[14px] rounded w-[60%]"
            style={{ backgroundColor: 'var(--border)' }}
          />
          <div
            className="h-[12px] rounded w-[40%]"
            style={{ backgroundColor: 'var(--border)' }}
          />
          <div
            className="h-[11px] rounded w-[80%]"
            style={{ backgroundColor: 'var(--border)' }}
          />
        </div>
        <div className="flex gap-[6px] shrink-0">
          <div
            className="h-[30px] w-[60px] rounded-[6px]"
            style={{ backgroundColor: 'var(--border)' }}
          />
          <div
            className="h-[30px] w-[60px] rounded-[6px]"
            style={{ backgroundColor: 'var(--border)' }}
          />
        </div>
      </div>
    </div>
  );
}

export const SuggestionPanel: React.FC<SuggestionPanelProps> = ({
  title,
  items,
  onAccept,
  onDismiss,
  onAcceptAll,
  onDismissAll,
  acceptedIds,
  dismissedIds,
  isLoading = false,
  emptyMessage = 'No suggestions available',
}) => {
  const pendingItems = items.filter(
    (i) => !acceptedIds.has(i.id) && !dismissedIds.has(i.id)
  );
  const acceptedItems = items.filter((i) => acceptedIds.has(i.id));
  const dismissedItems = items.filter((i) => dismissedIds.has(i.id));
  const hasPending = pendingItems.length > 0;

  if (isLoading) {
    return (
      <div
        className="rounded-[10px] border p-[16px]"
        style={{ backgroundColor: 'rgba(45,106,79,0.04)', borderColor: 'var(--green)' }}
      >
        <div className="flex items-center gap-[8px] mb-[14px]">
          <div className="w-[16px] h-[16px] border-2 border-[var(--green)] border-t-transparent rounded-full animate-spin" />
          <h4 className="text-[13px] font-[600] text-[var(--green-l)]">
            AI is generating recommendations...
          </h4>
        </div>
        <div className="space-y-[8px]">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        className="rounded-[10px] border p-[16px] text-center"
        style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}
      >
        <p className="text-[12px] text-[var(--text-4)]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-[10px] border p-[16px]"
      style={{ backgroundColor: 'rgba(45,106,79,0.04)', borderColor: 'var(--green)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-[12px]">
        <div className="flex items-center gap-[6px]">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 1L8.5 4.5L12.5 5L9.5 7.5L10.5 11.5L7 9.5L3.5 11.5L4.5 7.5L1.5 5L5.5 4.5L7 1Z"
              fill="var(--green-l)"
            />
          </svg>
          <h4 className="text-[13px] font-[600] text-[var(--green-l)]">{title}</h4>
          <span className="text-[11px] text-[var(--text-4)]">
            {acceptedItems.length} accepted, {pendingItems.length} pending
          </span>
        </div>
        {hasPending && (
          <div className="flex gap-[6px]">
            <button
              type="button"
              onClick={onAcceptAll}
              className="px-[10px] py-[4px] rounded-[6px] text-[11px] font-[500] cursor-pointer border transition-colors"
              style={{
                backgroundColor: 'rgba(45,106,79,0.15)',
                borderColor: 'var(--green)',
                color: 'var(--green-l)',
              }}
            >
              Accept All
            </button>
            <button
              type="button"
              onClick={onDismissAll}
              className="px-[10px] py-[4px] rounded-[6px] text-[11px] font-[500] cursor-pointer border transition-colors"
              style={{
                backgroundColor: 'var(--surface2)',
                borderColor: 'var(--border)',
                color: 'var(--text-3)',
              }}
            >
              Dismiss All
            </button>
          </div>
        )}
      </div>

      {/* Pending items */}
      <div className="space-y-[8px]">
        {pendingItems.map((item) => (
          <div
            key={item.id}
            className="rounded-[8px] border p-[12px] transition-colors"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-start gap-[10px]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-[8px]">
                  <span className="text-[13px] font-[500] text-[var(--text)]">
                    {item.title}
                  </span>
                  {item.subtitle && (
                    <span className="text-[11px] text-[var(--text-4)]">
                      {item.subtitle}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[var(--text-3)] mt-[2px]">{item.reason}</p>
                {item.warning && (
                  <p className="text-[11px] mt-[2px]" style={{ color: 'var(--status-amber)' }}>
                    {item.warning}
                  </p>
                )}
                {item.metadata && Object.keys(item.metadata).length > 0 && (
                  <div className="flex gap-[8px] mt-[4px] flex-wrap">
                    {Object.entries(item.metadata).map(([key, val]) => (
                      <span
                        key={key}
                        className="text-[10px] px-[6px] py-[2px] rounded-[4px]"
                        style={{ backgroundColor: 'var(--surface2)', color: 'var(--text-3)' }}
                      >
                        {key}: {val}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-[6px] shrink-0">
                <button
                  type="button"
                  onClick={() => onAccept(item.id)}
                  className="px-[10px] py-[5px] rounded-[6px] text-[11px] font-[500] cursor-pointer border transition-colors"
                  style={{
                    backgroundColor: 'rgba(45,106,79,0.15)',
                    borderColor: 'var(--green)',
                    color: 'var(--green-l)',
                  }}
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => onDismiss(item.id)}
                  className="px-[10px] py-[5px] rounded-[6px] text-[11px] font-[500] cursor-pointer border transition-colors"
                  style={{
                    backgroundColor: 'var(--surface2)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-3)',
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Accepted items */}
        {acceptedItems.map((item) => (
          <div
            key={item.id}
            className="rounded-[8px] border px-[12px] py-[8px] flex items-center gap-[8px]"
            style={{
              backgroundColor: 'rgba(45,106,79,0.08)',
              borderColor: 'var(--green)',
              opacity: 0.8,
            }}
          >
            <span className="text-[var(--green-l)] text-[14px]">&#10003;</span>
            <span className="text-[12px] text-[var(--text-2)] flex-1">{item.title}</span>
            {item.subtitle && (
              <span className="text-[11px] text-[var(--text-4)]">{item.subtitle}</span>
            )}
          </div>
        ))}

        {/* Dismissed items */}
        {dismissedItems.map((item) => (
          <div
            key={item.id}
            className="rounded-[8px] border px-[12px] py-[6px] flex items-center gap-[8px]"
            style={{
              backgroundColor: 'var(--surface2)',
              borderColor: 'var(--border)',
              opacity: 0.5,
            }}
          >
            <span className="text-[var(--text-4)] text-[12px] line-through flex-1">
              {item.title}
            </span>
            <button
              type="button"
              onClick={() => onAccept(item.id)}
              className="text-[11px] cursor-pointer bg-transparent border-none underline"
              style={{ color: 'var(--text-3)' }}
            >
              Undo
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SuggestionPanel;
