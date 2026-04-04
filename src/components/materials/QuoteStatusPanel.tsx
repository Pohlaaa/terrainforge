import React, { useEffect } from 'react';
import { useQuoteStore } from '@/stores/quoteStore';
import type { QuoteRequest, QuoteRequestStatus } from '@/types';

interface QuoteStatusPanelProps {
  projectId: string;
  onViewQuote?: (quoteRequest: QuoteRequest) => void;
}

const STATUS_CONFIG: Record<QuoteRequestStatus, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: 'var(--text-tertiary)', bg: 'var(--surface-hover)' },
  sent: { label: 'Sent', color: 'var(--status-blue)', bg: 'var(--status-blue-bg, color-mix(in srgb, var(--status-blue) 12%, transparent))' },
  received: { label: 'Received', color: 'var(--status-amber)', bg: 'var(--status-amber-bg)' },
  accepted: { label: 'Accepted', color: 'var(--status-green)', bg: 'var(--status-green-bg)' },
  declined: { label: 'Declined', color: 'var(--status-red)', bg: 'var(--status-red-bg)' },
  expired: { label: 'Expired', color: 'var(--text-tertiary)', bg: 'var(--surface-hover)' },
};

export const QuoteStatusPanel: React.FC<QuoteStatusPanelProps> = ({
  projectId,
  onViewQuote,
}) => {
  const { quoteRequests, fetchQuoteRequests, getQuotesForProject, updateStatus, isLoading } = useQuoteStore();

  useEffect(() => {
    fetchQuoteRequests(projectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const quotes = getQuotesForProject(projectId);

  if (isLoading && quotes.length === 0) {
    return (
      <div className="p-4 text-[13px] text-[var(--text-tertiary)]">Loading quotes...</div>
    );
  }

  if (quotes.length === 0) {
    return (
      <div className="p-4 text-center">
        <div className="text-[13px] text-[var(--text-tertiary)]">
          No quote requests for this project yet.
        </div>
        <div className="text-[12px] text-[var(--text-tertiary)] mt-1">
          Generate a manifest first, then create a quote request from it.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {quotes.map((quote) => {
        const config = STATUS_CONFIG[quote.status];
        return (
          <div
            key={quote.id}
            className="flex items-center gap-3 px-4 py-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
            onClick={() => onViewQuote?.(quote)}
          >
            {/* Supplier + date */}
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-[500] text-[var(--text-primary)]">
                {quote.supplierName ?? 'Unknown Supplier'}
              </div>
              <div className="text-[12px] text-[var(--text-tertiary)] mt-0.5">
                Created {new Date(quote.createdAt).toLocaleDateString()}
                {quote.sentAt && ` · Sent ${new Date(quote.sentAt).toLocaleDateString()}`}
              </div>
            </div>

            {/* Quoted total */}
            {quote.totalQuoted !== null && (
              <div className="text-[15px] font-[600] text-[var(--text-primary)] tabular-nums">
                ${quote.totalQuoted.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            )}

            {/* Status badge */}
            <span
              className="text-[11px] font-[600] px-2.5 py-1 rounded-full whitespace-nowrap"
              style={{ color: config.color, backgroundColor: config.bg }}
            >
              {config.label}
            </span>

            {/* Quick status actions */}
            {quote.status === 'draft' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateStatus(quote.id, 'sent');
                }}
                className="text-[11px] font-[500] px-3 py-1.5 rounded-lg bg-[var(--brand-primary)] text-white hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap"
              >
                Mark Sent
              </button>
            )}
            {quote.status === 'sent' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateStatus(quote.id, 'received');
                }}
                className="text-[11px] font-[500] px-3 py-1.5 rounded-lg bg-[var(--status-amber)] text-white hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap"
              >
                Mark Received
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
