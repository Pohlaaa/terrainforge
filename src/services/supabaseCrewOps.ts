import { supabase } from './supabase'
import { toCamelCase, toSnakeCase, onSupabaseError } from './supabaseCore'
import type { ProjectCrewAssignment } from '@/types'

// ===== PROJECT CREW ASSIGNMENTS =====

export async function fetchProjectCrewAssignments(
  orgId: string,
  projectId: string
): Promise<ProjectCrewAssignment[]> {
  try {
    const { data, error } = await supabase
      .from('project_crew_assignments')
      .select('*')
      .eq('org_id', orgId)
      .eq('project_id', projectId);

    if (error) throw error;
    return (data || []).map((row) => toCamelCase(row) as unknown as ProjectCrewAssignment);
  } catch (err: unknown) {
    onSupabaseError('SELECT', 'project_crew_assignments', err);
    return [];
  }
}

export async function fetchAllProjectCrewAssignments(
  orgId: string
): Promise<ProjectCrewAssignment[]> {
  try {
    const { data, error } = await supabase
      .from('project_crew_assignments')
      .select('*')
      .eq('org_id', orgId);

    if (error) throw error;
    return (data || []).map((row) => toCamelCase(row) as unknown as ProjectCrewAssignment);
  } catch (err: unknown) {
    onSupabaseError('SELECT', 'project_crew_assignments', err);
    return [];
  }
}

export async function createProjectCrewAssignment(
  assignment: Omit<ProjectCrewAssignment, 'id' | 'assignedAt'>,
  id: string,
  orgId: string
): Promise<ProjectCrewAssignment | null> {
  try {
    const snakeData = toSnakeCase(assignment as unknown as Record<string, unknown>);
    snakeData.id = id;
    snakeData.org_id = orgId;

    const { data, error } = await supabase
      .from('project_crew_assignments')
      .insert([snakeData])
      .select()
      .single();

    if (error) {
      // Handle unique constraint violation gracefully
      if (error.code === '23505') {
        onSupabaseError('INSERT', 'project_crew_assignments', { ...error, message: 'Crew member already assigned to this project' });
        return null;
      }
      throw error;
    }
    return toCamelCase(data) as unknown as ProjectCrewAssignment;
  } catch (err: unknown) {
    onSupabaseError('INSERT', 'project_crew_assignments', err);
    return null;
  }
}

export async function deleteProjectCrewAssignment(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('project_crew_assignments')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (err: unknown) {
    onSupabaseError('DELETE', 'project_crew_assignments', err);
    return false;
  }
}

// ===== CREW STATUS =====

export async function fetchCrewStatus(crewMemberId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('crew_status')
      .select('status')
      .eq('crew_member_id', crewMemberId)
      .single();
    if (error) return 'off_duty';
    return data?.status || 'off_duty';
  } catch {
    return 'off_duty';
  }
}

export async function upsertCrewStatus(
  orgId: string,
  crewMemberId: string,
  scheduleEntryId: string,
  status: string,
): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from('crew_status')
      .select('id')
      .eq('crew_member_id', crewMemberId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('crew_status')
        .update({
          status,
          schedule_entry_id: scheduleEntryId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('crew_status')
        .insert([{
          org_id: orgId,
          crew_member_id: crewMemberId,
          schedule_entry_id: scheduleEntryId,
          status,
        }]);
      if (error) throw error;
    }
  } catch (err: unknown) {
    onSupabaseError('UPSERT', 'crew_status', err);
  }
}

// ===== CREW STATUS (BATCH) =====

export async function fetchAllCrewStatuses(
  orgId: string,
): Promise<Array<{ crewMemberId: string; status: string }>> {
  try {
    const { data, error } = await supabase
      .from('crew_status')
      .select('crew_member_id, status')
      .eq('org_id', orgId);
    if (error) throw error;
    return (data || []).map(row => ({
      crewMemberId: row.crew_member_id,
      status: row.status,
    }));
  } catch (err: unknown) {
    onSupabaseError('SELECT', 'crew_status', err);
    return [];
  }
}

// ===== CREW CHECKLIST PROGRESS =====

export async function fetchChecklistProgress(
  scheduleEntryId: string,
): Promise<Array<{ zoneId: string; stepNumber: number }>> {
  try {
    const { data, error } = await supabase
      .from('crew_checklist_progress')
      .select('zone_id, step_number')
      .eq('schedule_entry_id', scheduleEntryId);
    if (error) throw error;
    return (data || []).map(row => ({
      zoneId: row.zone_id,
      stepNumber: row.step_number,
    }));
  } catch (err: unknown) {
    onSupabaseError('SELECT', 'crew_checklist_progress', err);
    return [];
  }
}

export async function saveChecklistStep(
  orgId: string,
  scheduleEntryId: string,
  crewMemberId: string,
  zoneId: string,
  stepNumber: number,
): Promise<void> {
  try {
    const { error } = await supabase
      .from('crew_checklist_progress')
      .insert([{
        org_id: orgId,
        schedule_entry_id: scheduleEntryId,
        crew_member_id: crewMemberId,
        zone_id: zoneId,
        step_number: stepNumber,
      }]);
    if (error) throw error;
  } catch (err: unknown) {
    const e = err as Record<string, unknown> | null;
    if (e?.code === '23505') return; // unique constraint — step already saved
    onSupabaseError('INSERT', 'crew_checklist_progress', err);
  }
}

export async function removeChecklistStep(
  scheduleEntryId: string,
  zoneId: string,
  stepNumber: number,
): Promise<void> {
  try {
    const { error } = await supabase
      .from('crew_checklist_progress')
      .delete()
      .eq('schedule_entry_id', scheduleEntryId)
      .eq('zone_id', zoneId)
      .eq('step_number', stepNumber);
    if (error) throw error;
  } catch (err: unknown) {
    onSupabaseError('DELETE', 'crew_checklist_progress', err);
  }
}

export async function fetchChecklistProgressCounts(
  scheduleEntryIds: string[],
): Promise<Record<string, number>> {
  if (scheduleEntryIds.length === 0) return {};
  try {
    const { data, error } = await supabase
      .from('crew_checklist_progress')
      .select('schedule_entry_id')
      .in('schedule_entry_id', scheduleEntryIds);
    if (error) throw error;
    const counts: Record<string, number> = {};
    for (const row of data || []) {
      counts[row.schedule_entry_id] = (counts[row.schedule_entry_id] || 0) + 1;
    }
    return counts;
  } catch (err: unknown) {
    onSupabaseError('SELECT', 'crew_checklist_progress', err);
    return {};
  }
}

// ===== CREW PHOTOS =====

export interface CrewPhoto {
  id: string;
  storagePath: string;
  caption: string;
  zoneId: string | null;
  stepNumber: number | null;
  uploadedAt: string;
}

export async function uploadCrewPhoto(
  orgId: string,
  scheduleEntryId: string,
  crewMemberId: string,
  file: File,
  zoneId?: string,
  stepNumber?: number,
  caption?: string,
): Promise<CrewPhoto | null> {
  try {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${orgId}/${scheduleEntryId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('crew-photos')
      .upload(path, file, { cacheControl: '3600', upsert: false });
    if (uploadError) throw uploadError;

    const { data, error } = await supabase
      .from('crew_photos')
      .insert([{
        org_id: orgId,
        schedule_entry_id: scheduleEntryId,
        crew_member_id: crewMemberId,
        zone_id: zoneId || null,
        step_number: stepNumber || null,
        storage_path: path,
        caption: caption || '',
      }])
      .select()
      .single();
    if (error) throw error;

    return {
      id: data.id,
      storagePath: data.storage_path,
      caption: data.caption,
      zoneId: data.zone_id,
      stepNumber: data.step_number,
      uploadedAt: data.uploaded_at,
    };
  } catch (err: unknown) {
    onSupabaseError('UPLOAD', 'crew_photos', err);
    return null;
  }
}

export async function fetchCrewPhotos(
  scheduleEntryId: string,
): Promise<CrewPhoto[]> {
  try {
    const { data, error } = await supabase
      .from('crew_photos')
      .select('id, storage_path, caption, zone_id, step_number, uploaded_at')
      .eq('schedule_entry_id', scheduleEntryId)
      .order('uploaded_at', { ascending: true });
    if (error) throw error;
    return (data || []).map(row => ({
      id: row.id,
      storagePath: row.storage_path,
      caption: row.caption,
      zoneId: row.zone_id,
      stepNumber: row.step_number,
      uploadedAt: row.uploaded_at,
    }));
  } catch (err: unknown) {
    onSupabaseError('SELECT', 'crew_photos', err);
    return [];
  }
}

export async function getPhotoUrl(storagePath: string): Promise<string> {
  const { data } = await supabase.storage
    .from('crew-photos')
    .createSignedUrl(storagePath, 3600);
  return data?.signedUrl || '';
}

export async function deleteCrewPhoto(id: string, storagePath: string): Promise<boolean> {
  try {
    await supabase.storage.from('crew-photos').remove([storagePath]);
    const { error } = await supabase.from('crew_photos').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (err: unknown) {
    onSupabaseError('DELETE', 'crew_photos', err);
    return false;
  }
}
