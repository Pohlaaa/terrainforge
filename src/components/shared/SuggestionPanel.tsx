import React, { useState } from 'react';

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
  /** Custom renderer for accepted items. When provided, replaces the default accepted card. */
  renderAccepted?: (item: SuggestionItem) => React.ReactNode;
  /** Called when user clicks edit on an accepted item. If not provided, inline edit is used. */
  onEditAccepted?: (id: string) => void;
  /** Called when user clicks remove on an accepted item (un-accept + remove from data) */
  onRemoveAccepted?: (id: string) => void;
  /** Called to save edits to an accepted item's metadata */
  onUpdateAccepted?: (id: string, metadata: Record<string, string | number>) => void;
  /** Called when user clicks "Add" at the bottom of the panel */
  onAdd?: () => void;
  /** Label for the add button */
  addLabel?: string;
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
  renderAccepted,
  onEditAccepted,
  onRemoveAccepted,
  onAdd,
  addLabel,
  onUpdateAccepted,
}) => {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
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
          renderAccepted ? (
            <div key={item.id}>{renderAccepted(item)}</div>
          ) : (
            <div
              key={item.id}
              className="rounded-[8px] border px-[12px] py-[8px] flex items-center gap-[8px]"
              style={{
                backgroundColor: 'rgba(45,106,79,0.08)',
                borderColor: 'var(--green)',
              }}
            >
              <span className="text-[var(--green-l)] text-[14px]">&#10003;</span>
              <span className="text-[12px] text-[var(--text-2)] flex-1">{item.title}</span>
              {item.subtitle && (
                <span className="text-[11px] text-[var(--text-4)]">{item.subtitle}</span>
              )}
              {editingItemId === item.id && item.metadata ? (
                // Inline editing mode
                Object.entries(item.metadata).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-[4px]">
                    <span className="text-[10px] text-[var(--text-4)]">{k}:</span>
                    <input
                      className="w-[60px] bg-[var(--surface)] border border-[var(--border)] rounded-[4px] px-[4px] py-[2px] text-[11px] text-[var(--text)] text-right focus:outline-none focus:border-[var(--green)]"
                      defaultValue={String(v)}
                      onBlur={(e) => {
                        if (onUpdateAccepted && item.metadata) {
                          onUpdateAccepted(item.id, { ...item.metadata, [k]: e.target.value });
                        }
                      }}
                    />
                  </div>
                ))
              ) : (
                item.metadata && Object.entries(item.metadata).map(([k, v]) => (
                  <span key={k} className="text-[10px] text-[var(--text-4)]">{k}: {v}</span>
                ))
              )}
              <button type="button" onClick={() => {
                if (editingItemId === item.id) { setEditingItemId(null); }
                else if (onEditAccepted) { onEditAccepted(item.id); }
                else { setEditingItemId(item.id); }
              }}
                className="w-[22px] h-[22px] rounded-[4px] flex items-center justify-center text-[var(--text-4)] hover:text-[var(--text)] hover:bg-[var(--surface)] cursor-pointer bg-transparent border-none transition-colors" title="Edit">
                {editingItemId === item.id ? (
                  <span className="text-[10px] text-[var(--green-l)]">✓</span>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z" /></svg>
                )}
              </button>
              {onRemoveAccepted && (
                <button type="button" onClick={() => onRemoveAccepted(item.id)}
                  className="w-[22px] h-[22px] rounded-[4px] flex items-center justify-center text-[var(--text-4)] hover:text-[var(--status-red)] hover:bg-[var(--surface)] cursor-pointer bg-transparent border-none transition-colors" title="Remove">
                  ✕
                </button>
              )}
            </div>
          )
        ))}

        {/* Add button at bottom */}
        {onAdd && (
          <button type="button" onClick={onAdd}
            className="w-full rounded-[6px] border border-dashed py-[6px] text-[12px] font-[500] cursor-pointer bg-transparent transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--green-l)' }}
          >
            + {addLabel || 'Add'}
          </button>
        )}

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
