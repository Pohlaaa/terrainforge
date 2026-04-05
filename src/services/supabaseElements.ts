import { supabase } from './supabase'
import { toCamelCase, toSnakeCase, onSupabaseError } from './supabaseCore'
import type { ProjectElement } from '@/types'

// ===== PROJECT ELEMENTS =====

export async function fetchProjectElements(
  orgId: string,
  projectId: string
): Promise<ProjectElement[]> {
  try {
    const { data, error } = await supabase
      .from('project_elements')
      .select('*')
      .eq('org_id', orgId)
      .eq('project_id', projectId)
      .order('sequence', { ascending: true });

    if (error) throw error;
    return (data || []).map((row) => {
      const camel = toCamelCase(row) as unknown as ProjectElement;
      if (!camel.materials) camel.materials = [];
      return camel;
    });
  } catch (err: unknown) {
    onSupabaseError('SELECT', 'project_elements', err);
    return [];
  }
}

export async function createProjectElement(
  element: Omit<ProjectElement, 'id' | 'materials'>,
  id: string,
  orgId: string
): Promise<ProjectElement | null> {
  try {
    const snakeData = toSnakeCase(element as unknown as Record<string, unknown>);
    snakeData.id = id;
    snakeData.org_id = orgId;
    // Remove materials — it's a frontend-only join, not a DB column
    delete snakeData.materials;

    const { data, error } = await supabase
      .from('project_elements')
      .insert([snakeData])
      .select()
      .single();

    if (error) throw error;
    const result = toCamelCase(data) as unknown as ProjectElement;
    result.materials = [];
    return result;
  } catch (err: unknown) {
    onSupabaseError('INSERT', 'project_elements', err);
    return null;
  }
}

export async function updateProjectElement(
  id: string,
  updates: Partial<ProjectElement>
): Promise<ProjectElement | null> {
  try {
    const snakeData = toSnakeCase(updates as unknown as Record<string, unknown>);
    delete snakeData.materials;
    delete snakeData.id;

    const { data, error } = await supabase
      .from('project_elements')
      .update(snakeData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    const result = toCamelCase(data) as unknown as ProjectElement;
    result.materials = [];
    return result;
  } catch (err: unknown) {
    onSupabaseError('UPDATE', 'project_elements', err);
    return null;
  }
}

export async function deleteProjectElement(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('project_elements')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (err: unknown) {
    onSupabaseError('DELETE', 'project_elements', err);
    return false;
  }
}
