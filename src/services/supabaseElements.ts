import { supabase } from './supabase'
import { toCamelCase, toSnakeCase, onSupabaseError } from './supabaseCore'
import type { ProjectElement, ProjectElementMaterial } from '@/types'

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

    const elements = (data || []).map((row) => {
      const camel = toCamelCase(row) as unknown as ProjectElement;
      camel.materials = [];
      return camel;
    });

    // Fetch element materials for all elements in one query
    if (elements.length > 0) {
      const elementIds = elements.map(el => el.id);
      const { data: matData, error: matError } = await supabase
        .from('project_element_materials')
        .select('*')
        .eq('org_id', orgId)
        .in('element_id', elementIds);

      if (!matError && matData) {
        const matsByElement: Record<string, ProjectElementMaterial[]> = {};
        for (const row of matData) {
          const mat = toCamelCase(row) as unknown as ProjectElementMaterial;
          if (!matsByElement[mat.elementId]) matsByElement[mat.elementId] = [];
          matsByElement[mat.elementId].push(mat);
        }
        for (const el of elements) {
          el.materials = matsByElement[el.id] || [];
        }
      }
    }

    return elements;
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

// ===== PROJECT ELEMENT MATERIALS =====

export async function fetchElementMaterials(
  orgId: string,
  elementId: string
): Promise<ProjectElementMaterial[]> {
  try {
    const { data, error } = await supabase
      .from('project_element_materials')
      .select('*')
      .eq('org_id', orgId)
      .eq('element_id', elementId);

    if (error) throw error;
    return (data || []).map((row) => toCamelCase(row) as unknown as ProjectElementMaterial);
  } catch (err: unknown) {
    onSupabaseError('SELECT', 'project_element_materials', err);
    return [];
  }
}

export async function createElementMaterial(
  material: Omit<ProjectElementMaterial, 'id' | 'createdAt'>,
  id: string,
  orgId: string
): Promise<ProjectElementMaterial | null> {
  try {
    const snakeData = toSnakeCase(material as unknown as Record<string, unknown>);
    snakeData.id = id;
    snakeData.org_id = orgId;

    const { data, error } = await supabase
      .from('project_element_materials')
      .insert([snakeData])
      .select()
      .single();

    if (error) throw error;
    return toCamelCase(data) as unknown as ProjectElementMaterial;
  } catch (err: unknown) {
    onSupabaseError('INSERT', 'project_element_materials', err);
    return null;
  }
}

export async function updateElementMaterial(
  id: string,
  updates: Partial<ProjectElementMaterial>
): Promise<ProjectElementMaterial | null> {
  try {
    const snakeData = toSnakeCase(updates as unknown as Record<string, unknown>);
    delete snakeData.id;

    const { data, error } = await supabase
      .from('project_element_materials')
      .update(snakeData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return toCamelCase(data) as unknown as ProjectElementMaterial;
  } catch (err: unknown) {
    onSupabaseError('UPDATE', 'project_element_materials', err);
    return null;
  }
}

export async function deleteElementMaterial(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('project_element_materials')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (err: unknown) {
    onSupabaseError('DELETE', 'project_element_materials', err);
    return false;
  }
}

export async function deleteElementMaterialsByElement(elementId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('project_element_materials')
      .delete()
      .eq('element_id', elementId);

    if (error) throw error;
    return true;
  } catch (err: unknown) {
    onSupabaseError('DELETE', 'project_element_materials', err);
    return false;
  }
}
