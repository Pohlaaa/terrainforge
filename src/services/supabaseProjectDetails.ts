import { supabase } from './supabase'
import { toCamelCase, toSnakeCase, onSupabaseError } from './supabaseCore'
import type { ProjectTask, ProjectSiteCondition, ProjectSubcontractor, ProjectDocument, ProjectPermit } from '@/types'

// ===== PROJECT TASK SUMMARIES =====

/** Fetch task count summaries for all projects in an org — used by project cards */
export async function fetchTaskSummaries(
  orgId: string
): Promise<Record<string, { total: number; completed: number }>> {
  try {
    const { data, error } = await supabase
      .from('project_tasks')
      .select('project_id, status')
      .eq('org_id', orgId);

    if (error) throw error;

    const summaries: Record<string, { total: number; completed: number }> = {};
    for (const row of data || []) {
      const pid = row.project_id;
      if (!summaries[pid]) summaries[pid] = { total: 0, completed: 0 };
      summaries[pid].total++;
      if (row.status === 'completed') summaries[pid].completed++;
    }
    return summaries;
  } catch (err: unknown) {
    onSupabaseError('SELECT', 'project_tasks', err);
    return {};
  }
}

// ===== PROJECT TASKS =====

export async function fetchProjectTasks(
  orgId: string,
  projectId: string
): Promise<ProjectTask[]> {
  try {
    const { data, error } = await supabase
      .from('project_tasks')
      .select('*')
      .eq('org_id', orgId)
      .eq('project_id', projectId)
      .order('sequence_number', { ascending: true });

    if (error) throw error;
    return (data || []).map((row) => {
      const camel = toCamelCase(row) as unknown as ProjectTask;
      // Ensure depends_on comes back as an array even if null
      if (!camel.dependsOn) camel.dependsOn = [];
      return camel;
    });
  } catch (err: unknown) {
    onSupabaseError('SELECT', 'project_tasks', err);
    return [];
  }
}

export async function createProjectTask(
  task: Omit<ProjectTask, 'id' | 'createdAt' | 'updatedAt'>,
  id: string,
  orgId: string
): Promise<ProjectTask | null> {
  try {
    const snakeData = toSnakeCase(task as unknown as Record<string, unknown>);
    snakeData.id = id;
    snakeData.org_id = orgId;
    // depends_on is a UUID[] — keep as-is
    snakeData.depends_on = task.dependsOn || [];

    const { data, error } = await supabase
      .from('project_tasks')
      .insert([snakeData])
      .select()
      .single();

    if (error) throw error;
    const result = toCamelCase(data) as unknown as ProjectTask;
    if (!result.dependsOn) result.dependsOn = [];
    return result;
  } catch (err: unknown) {
    onSupabaseError('INSERT', 'project_tasks', err);
    return null;
  }
}

export async function updateProjectTask(
  id: string,
  updates: Partial<ProjectTask>
): Promise<ProjectTask | null> {
  try {
    const snakeData = toSnakeCase(updates as unknown as Record<string, unknown>);
    if (updates.dependsOn !== undefined) {
      snakeData.depends_on = updates.dependsOn;
    }

    const { data, error } = await supabase
      .from('project_tasks')
      .update(snakeData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    const result = toCamelCase(data) as unknown as ProjectTask;
    if (!result.dependsOn) result.dependsOn = [];
    return result;
  } catch (err: unknown) {
    onSupabaseError('UPDATE', 'project_tasks', err);
    return null;
  }
}

export async function deleteProjectTask(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('project_tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (err: unknown) {
    onSupabaseError('DELETE', 'project_tasks', err);
    return false;
  }
}

// ===== PROJECT SITE CONDITIONS =====

export async function fetchProjectSiteConditions(
  orgId: string,
  projectId: string
): Promise<ProjectSiteCondition[]> {
  try {
    const { data, error } = await supabase
      .from('project_site_conditions')
      .select('*')
      .eq('org_id', orgId)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map((row) => toCamelCase(row) as unknown as ProjectSiteCondition);
  } catch (err: unknown) {
    onSupabaseError('SELECT', 'project_site_conditions', err);
    return [];
  }
}

export async function createProjectSiteCondition(
  condition: Omit<ProjectSiteCondition, 'id' | 'createdAt' | 'updatedAt'>,
  id: string,
  orgId: string
): Promise<ProjectSiteCondition | null> {
  try {
    const snakeData = toSnakeCase(condition as unknown as Record<string, unknown>);
    snakeData.id = id;
    snakeData.org_id = orgId;

    const { data, error } = await supabase
      .from('project_site_conditions')
      .insert([snakeData])
      .select()
      .single();

    if (error) throw error;
    return toCamelCase(data) as unknown as ProjectSiteCondition;
  } catch (err: unknown) {
    onSupabaseError('INSERT', 'project_site_conditions', err);
    return null;
  }
}

export async function updateProjectSiteCondition(
  id: string,
  updates: Partial<ProjectSiteCondition>
): Promise<ProjectSiteCondition | null> {
  try {
    const snakeData = toSnakeCase(updates as unknown as Record<string, unknown>);

    const { data, error } = await supabase
      .from('project_site_conditions')
      .update(snakeData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return toCamelCase(data) as unknown as ProjectSiteCondition;
  } catch (err: unknown) {
    onSupabaseError('UPDATE', 'project_site_conditions', err);
    return null;
  }
}

export async function deleteProjectSiteCondition(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('project_site_conditions')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (err: unknown) {
    onSupabaseError('DELETE', 'project_site_conditions', err);
    return false;
  }
}

// ===== PROJECT SUBCONTRACTORS =====

export async function fetchProjectSubcontractors(
  orgId: string,
  projectId: string
): Promise<ProjectSubcontractor[]> {
  try {
    const { data, error } = await supabase
      .from('project_subcontractors')
      .select('*')
      .eq('org_id', orgId)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map((row) => toCamelCase(row) as unknown as ProjectSubcontractor);
  } catch (err: unknown) {
    onSupabaseError('SELECT', 'project_subcontractors', err);
    return [];
  }
}

export async function createProjectSubcontractor(
  sub: Omit<ProjectSubcontractor, 'id' | 'createdAt' | 'updatedAt'>,
  id: string,
  orgId: string
): Promise<ProjectSubcontractor | null> {
  try {
    const snakeData = toSnakeCase(sub as unknown as Record<string, unknown>);
    snakeData.id = id;
    snakeData.org_id = orgId;

    const { data, error } = await supabase
      .from('project_subcontractors')
      .insert([snakeData])
      .select()
      .single();

    if (error) throw error;
    return toCamelCase(data) as unknown as ProjectSubcontractor;
  } catch (err: unknown) {
    onSupabaseError('INSERT', 'project_subcontractors', err);
    return null;
  }
}

export async function updateProjectSubcontractor(
  id: string,
  updates: Partial<ProjectSubcontractor>
): Promise<ProjectSubcontractor | null> {
  try {
    const snakeData = toSnakeCase(updates as unknown as Record<string, unknown>);

    const { data, error } = await supabase
      .from('project_subcontractors')
      .update(snakeData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return toCamelCase(data) as unknown as ProjectSubcontractor;
  } catch (err: unknown) {
    onSupabaseError('UPDATE', 'project_subcontractors', err);
    return null;
  }
}

export async function deleteProjectSubcontractor(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('project_subcontractors')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (err: unknown) {
    onSupabaseError('DELETE', 'project_subcontractors', err);
    return false;
  }
}

// ===== PROJECT DOCUMENTS =====

export async function fetchProjectDocuments(
  orgId: string,
  projectId: string
): Promise<ProjectDocument[]> {
  try {
    const { data, error } = await supabase
      .from('project_documents')
      .select('*')
      .eq('org_id', orgId)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((row) => toCamelCase(row) as unknown as ProjectDocument);
  } catch (err: unknown) {
    onSupabaseError('SELECT', 'project_documents', err);
    return [];
  }
}

export async function createProjectDocument(
  doc: Omit<ProjectDocument, 'id' | 'createdAt'>,
  id: string,
  orgId: string
): Promise<ProjectDocument | null> {
  try {
    const snakeData = toSnakeCase(doc as unknown as Record<string, unknown>);
    snakeData.id = id;
    snakeData.org_id = orgId;

    const { data, error } = await supabase
      .from('project_documents')
      .insert([snakeData])
      .select()
      .single();

    if (error) throw error;
    return toCamelCase(data) as unknown as ProjectDocument;
  } catch (err: unknown) {
    onSupabaseError('INSERT', 'project_documents', err);
    return null;
  }
}

export async function updateProjectDocument(
  id: string,
  updates: Partial<ProjectDocument>
): Promise<ProjectDocument | null> {
  try {
    const snakeData = toSnakeCase(updates as unknown as Record<string, unknown>);

    const { data, error } = await supabase
      .from('project_documents')
      .update(snakeData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return toCamelCase(data) as unknown as ProjectDocument;
  } catch (err: unknown) {
    onSupabaseError('UPDATE', 'project_documents', err);
    return null;
  }
}

export async function deleteProjectDocument(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('project_documents')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (err: unknown) {
    onSupabaseError('DELETE', 'project_documents', err);
    return false;
  }
}

// ===== PROJECT PERMITS =====

export async function fetchProjectPermits(
  orgId: string,
  projectId: string
): Promise<ProjectPermit[]> {
  try {
    const { data, error } = await supabase
      .from('project_permits')
      .select('*')
      .eq('org_id', orgId)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map((row) => toCamelCase(row) as unknown as ProjectPermit);
  } catch (err: unknown) {
    onSupabaseError('SELECT', 'project_permits', err);
    return [];
  }
}

export async function createProjectPermit(
  permit: Omit<ProjectPermit, 'id' | 'createdAt' | 'updatedAt'>,
  id: string,
  orgId: string
): Promise<ProjectPermit | null> {
  try {
    const snakeData = toSnakeCase(permit as unknown as Record<string, unknown>);
    snakeData.id = id;
    snakeData.org_id = orgId;

    const { data, error } = await supabase
      .from('project_permits')
      .insert([snakeData])
      .select()
      .single();

    if (error) throw error;
    return toCamelCase(data) as unknown as ProjectPermit;
  } catch (err: unknown) {
    onSupabaseError('INSERT', 'project_permits', err);
    return null;
  }
}

export async function updateProjectPermit(
  id: string,
  updates: Partial<ProjectPermit>
): Promise<ProjectPermit | null> {
  try {
    const snakeData = toSnakeCase(updates as unknown as Record<string, unknown>);

    const { data, error } = await supabase
      .from('project_permits')
      .update(snakeData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return toCamelCase(data) as unknown as ProjectPermit;
  } catch (err: unknown) {
    onSupabaseError('UPDATE', 'project_permits', err);
    return null;
  }
}

export async function deleteProjectPermit(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('project_permits')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (err: unknown) {
    onSupabaseError('DELETE', 'project_permits', err);
    return false;
  }
}
