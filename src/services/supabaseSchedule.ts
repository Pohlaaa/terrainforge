import { supabase } from './supabase'
import { toCamelCase, toSnakeCase, onSupabaseError } from './supabaseCore'
import type { ScheduleEntry } from '@/types'

// ===== SCHEDULE ENTRIES =====

export async function fetchScheduleEntries(
  orgId: string,
  startDate: string,
  endDate: string
): Promise<ScheduleEntry[]> {
  try {
    const { data, error } = await supabase
      .from('schedule_entries')
      .select('*')
      .eq('org_id', orgId)
      .gte('scheduled_date', startDate)
      .lte('scheduled_date', endDate)
      .order('scheduled_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw error;
    return (data || []).map((row) => toCamelCase(row) as unknown as ScheduleEntry);
  } catch (err: unknown) {
    onSupabaseError('SELECT', 'schedule_entries', err);
    return [];
  }
}

// ===== SCHEDULE ENTRIES (project-filtered) =====

export async function fetchScheduleEntriesForProject(
  orgId: string,
  projectId: string
): Promise<ScheduleEntry[]> {
  try {
    const { data, error } = await supabase
      .from('schedule_entries')
      .select('*')
      .eq('org_id', orgId)
      .eq('project_id', projectId)
      .order('scheduled_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw error;
    return (data || []).map((row) => toCamelCase(row) as unknown as ScheduleEntry);
  } catch (err: unknown) {
    onSupabaseError('SELECT', 'schedule_entries', err);
    return [];
  }
}

export async function createScheduleEntry(
  data: Omit<ScheduleEntry, 'id' | 'createdAt' | 'updatedAt'>,
  id: string,
  orgId: string
): Promise<void> {
  try {
    const snakeData = toSnakeCase(data as unknown as Record<string, unknown>);
    snakeData.id = id;
    snakeData.org_id = orgId;

    const { error } = await supabase.from('schedule_entries').insert([snakeData]);
    if (error) throw error;
  } catch (err: unknown) {
    onSupabaseError('INSERT', 'schedule_entries', err);
  }
}

export async function updateScheduleEntry(
  id: string,
  updates: Partial<ScheduleEntry>
): Promise<void> {
  try {
    const snakeData = toSnakeCase(updates as unknown as Record<string, unknown>);
    snakeData.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('schedule_entries')
      .update(snakeData)
      .eq('id', id);

    if (error) throw error;
  } catch (err: unknown) {
    onSupabaseError('UPDATE', 'schedule_entries', err);
  }
}

export async function deleteScheduleEntry(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('schedule_entries')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (err: unknown) {
    onSupabaseError('DELETE', 'schedule_entries', err);
  }
}
