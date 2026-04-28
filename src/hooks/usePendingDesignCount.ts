import { useEffect, useState } from 'react';
import { useOrgStore } from '@/stores/orgStore';
import { fetchPendingDesignSubmissions } from '@/services/supabaseShareTokens';

/**
 * Sprint D Inc 1. Lightweight count of pending client_design submissions for
 * the contractor's org. Drives the top-nav badge on the "More" dropdown so
 * contractors notice the queue without having to remember to check it.
 *
 * Single fetch on mount + a soft 60s refresh. Cheap; backed by an indexed
 * `client_changes_submitted_at` filter.
 */
export function usePendingDesignCount(): number {
  const orgId = useOrgStore((s) => s.org?.id);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;

    const load = () => {
      fetchPendingDesignSubmissions(orgId).then((rows) => {
        if (!cancelled) setCount(rows.length);
      });
    };

    load();
    const t = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [orgId]);

  return count;
}
