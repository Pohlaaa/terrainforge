import { supabase } from './supabase';
import { generateEngineManifest, type ManifestResult } from '@/materials-engine/engine';
import type { ProjectElement, Material } from '@/types';

/**
 * supabaseManifests
 *
 * Versioned snapshots of the materials engine output for a project. Inserted
 * automatically when a project transitions `approved → scheduled` so the
 * contractor has an audit trail of "what we ordered when we ordered it" — if
 * the catalog or element dimensions change later, the originally-quoted
 * manifest is preserved verbatim.
 *
 * Schema (migration 026):
 *   manifests (
 *     id uuid pk,
 *     project_id uuid fk → projects,
 *     org_id uuid fk → organizations,
 *     version int default 1,
 *     line_items jsonb,
 *     purchase_list jsonb,
 *     summary jsonb,
 *     generated_by uuid,
 *     generated_at timestamptz default now()
 *   )
 *
 * RLS: select scoped to org members; insert restricted to admin/designer;
 * delete restricted to admin.
 */

export interface ManifestRow {
  id: string;
  projectId: string;
  orgId: string;
  version: number;
  lineItems: ManifestResult['lineItems'];
  purchaseList: ManifestResult['purchaseList'];
  summary: ManifestResult['summary'];
  generatedBy: string | null;
  generatedAt: string;
}

/**
 * Pure function: build the row payload for an insert. Pulled out so it's
 * unit-testable without a Supabase client. The store calls this and forwards
 * the payload to supabase.from('manifests').insert(...).
 */
export function buildManifestInsert(opts: {
  projectId: string;
  orgId: string;
  version: number;
  result: ManifestResult;
  generatedBy?: string | null;
}): {
  project_id: string;
  org_id: string;
  version: number;
  line_items: ManifestResult['lineItems'];
  purchase_list: ManifestResult['purchaseList'];
  summary: ManifestResult['summary'];
  generated_by: string | null;
} {
  return {
    project_id: opts.projectId,
    org_id: opts.orgId,
    version: opts.version,
    line_items: opts.result.lineItems,
    purchase_list: opts.result.purchaseList,
    summary: opts.result.summary,
    generated_by: opts.generatedBy ?? null,
  };
}

/**
 * Find the highest existing version number for a project so the next
 * snapshot increments correctly. Returns 0 when none exist (next snapshot
 * will be version 1).
 */
export async function nextManifestVersion(projectId: string): Promise<number> {
  const { data, error } = await supabase
    .from('manifests')
    .select('version')
    .eq('project_id', projectId)
    .order('version', { ascending: false })
    .limit(1);

  if (error) {
    console.error('nextManifestVersion error:', error);
    return 1; // failsafe — let the insert proceed at v1 if we can't read history
  }
  const top = data?.[0]?.version ?? 0;
  return top + 1;
}

/**
 * Generate a manifest snapshot from current element + catalog data and
 * insert it. Used by the projectStore when status flips approved → scheduled.
 *
 * Returns the new row's id, or null if the engine produced an empty manifest
 * (no line items — nothing worth snapshotting).
 */
export async function snapshotManifestForProject(opts: {
  projectId: string;
  orgId: string;
  elements: ProjectElement[];
  catalog: Material[];
  generatedBy?: string | null;
}): Promise<string | null> {
  const result = generateEngineManifest(opts.elements, opts.catalog);
  if (result.lineItems.length === 0) {
    console.log(
      `snapshotManifestForProject: skipping ${opts.projectId} — engine produced no line items`,
    );
    return null;
  }

  const version = await nextManifestVersion(opts.projectId);
  const payload = buildManifestInsert({ ...opts, version, result });

  const { data, error } = await supabase
    .from('manifests')
    .insert(payload)
    .select('id')
    .single();

  if (error) {
    console.error('snapshotManifestForProject insert failed:', error);
    return null;
  }
  return (data as { id: string } | null)?.id ?? null;
}

/**
 * Read all manifest snapshots for a project, newest first. Used by an
 * upcoming UI surface ("manifest history") and by tests.
 */
export async function fetchManifestsForProject(projectId: string): Promise<ManifestRow[]> {
  const { data, error } = await supabase
    .from('manifests')
    .select('*')
    .eq('project_id', projectId)
    .order('version', { ascending: false });

  if (error) {
    console.error('fetchManifestsForProject error:', error);
    return [];
  }

  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: row.id as string,
      projectId: row.project_id as string,
      orgId: row.org_id as string,
      version: row.version as number,
      lineItems: (row.line_items ?? []) as ManifestResult['lineItems'],
      purchaseList: (row.purchase_list ?? []) as ManifestResult['purchaseList'],
      summary: (row.summary ?? {}) as ManifestResult['summary'],
      generatedBy: (row.generated_by as string | null) ?? null,
      generatedAt: row.generated_at as string,
    };
  });
}
