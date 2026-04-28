/**
 * ReviewQueue (Sprint D Inc 1)
 *
 * Cross-project list of pending client_design submissions. Replaces the
 * "click into each project to find what changed" workflow with a single
 * page that surfaces every share-token where the client clicked Submit.
 *
 * Selecting a row deep-links into ProjectDashboard's Overview tab, which is
 * where the existing "Accept changes" affordance lives — once the contractor
 * accepts, the underlying token's revoked_at is stamped and the row drops
 * out of this queue (next mount or manual refresh).
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrgStore } from '@/stores/orgStore';
import {
  fetchPendingDesignSubmissions,
  type PendingDesignSubmission,
} from '@/services/supabaseShareTokens';

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return 'just now';
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

export const ReviewQueue: React.FC = () => {
  const navigate = useNavigate();
  const orgId = useOrgStore((s) => s.org?.id);
  const [items, setItems] = useState<PendingDesignSubmission[] | null>(null);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    fetchPendingDesignSubmissions(orgId).then((rows) => {
      if (!cancelled) setItems(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const refresh = () => {
    if (!orgId) return;
    setItems(null);
    fetchPendingDesignSubmissions(orgId).then(setItems);
  };

  const empty = items !== null && items.length === 0;

  // Group by project so a contractor with two submissions on one project
  // sees them clustered, not interleaved with other projects.
  const grouped = useMemo(() => {
    if (!items) return null;
    const map = new Map<string, PendingDesignSubmission[]>();
    for (const it of items) {
      const arr = map.get(it.projectId) ?? [];
      arr.push(it);
      map.set(it.projectId, arr);
    }
    return [...map.entries()];
  }, [items]);

  return (
    <div className="space-y-[16px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-[700] text-[var(--text-primary)]">Review Queue</h1>
          <p className="text-[13px] text-[var(--text-tertiary)] mt-[2px]">
            Pending design submissions from clients across all your projects.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="px-[12px] py-[6px] rounded-[6px] border text-[12px] font-[500] cursor-pointer bg-transparent transition-colors hover:bg-[var(--surface-hover)]"
          style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
        >
          Refresh
        </button>
      </div>

      {/* Loading */}
      {items === null && (
        <div className="text-[13px] text-[var(--text-tertiary)] py-[24px] text-center">Loading…</div>
      )}

      {/* Empty state */}
      {empty && (
        <div
          className="rounded-[10px] border p-[24px] text-center"
          style={{ backgroundColor: 'var(--surface-card)', borderColor: 'var(--border-default)' }}
        >
          <div className="text-[14px] font-[600] text-[var(--text-primary)] mb-[4px]">
            Nothing waiting
          </div>
          <div className="text-[12px] text-[var(--text-tertiary)]">
            When a client submits design changes from a share link, it'll show up here.
          </div>
        </div>
      )}

      {/* Grouped list */}
      {grouped && grouped.length > 0 && (
        <div className="space-y-[12px]">
          {grouped.map(([projectId, subs]) => (
            <div
              key={projectId}
              className="rounded-[10px] border overflow-hidden"
              style={{ backgroundColor: 'var(--surface-card)', borderColor: 'var(--border-default)' }}
            >
              {/* Project header row */}
              <div
                className="flex items-center justify-between px-[14px] py-[10px] border-b"
                style={{ borderColor: 'var(--border-default)' }}
              >
                <div className="min-w-0">
                  <div className="text-[14px] font-[600] text-[var(--text-primary)] truncate">
                    {subs[0].projectName}
                  </div>
                  {subs[0].clientName && (
                    <div className="text-[11px] text-[var(--text-tertiary)] truncate">
                      Client: {subs[0].clientName}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/projects/${projectId}`)}
                  className="px-[10px] py-[5px] rounded-[5px] text-[11px] font-[600] border-none cursor-pointer"
                  style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--text-on-primary)' }}
                >
                  Open project →
                </button>
              </div>

              {/* Submissions */}
              <div>
                {subs.map((s) => (
                  <div
                    key={s.tokenId}
                    className="px-[14px] py-[10px] border-b last:border-b-0 flex items-start justify-between gap-[12px]"
                    style={{ borderColor: 'var(--border-light, var(--border-default))' }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] text-[var(--text-secondary)] flex items-center gap-[8px] flex-wrap">
                        <span
                          className="inline-block w-[6px] h-[6px] rounded-full"
                          style={{ backgroundColor: 'var(--status-green, #22c55e)' }}
                          aria-hidden
                        />
                        <span className="font-[500]">Submitted {relativeTime(s.clientChangesSubmittedAt)}</span>
                        <span className="text-[var(--text-tertiary)]">·</span>
                        <span className="text-[var(--text-tertiary)]">{new Date(s.clientChangesSubmittedAt).toLocaleString()}</span>
                      </div>
                      {s.clientChangesNote && (
                        <div
                          className="mt-[6px] text-[12px] text-[var(--text-primary)] px-[10px] py-[6px] rounded-[6px] whitespace-pre-wrap"
                          style={{ backgroundColor: 'var(--surface-hover, rgba(255,255,255,0.04))' }}
                        >
                          “{s.clientChangesNote}”
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewQueue;
