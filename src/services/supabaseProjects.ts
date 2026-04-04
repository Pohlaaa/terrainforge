import { supabase } from './supabase'
import { toCamelCase, toSnakeCase, onSupabaseError } from './supabaseCore'
import { createZone } from './supabaseZones'
import { fetchProjectTasks, fetchTaskSummaries } from './supabaseProjectDetails'
import { fetchProjectSubcontractors } from './supabaseProjectDetails'
import { fetchProjectPermits } from './supabaseProjectDetails'
import { fetchProjectSiteConditions } from './supabaseProjectDetails'
import { fetchProjectCrewAssignments } from './supabaseCrewOps'
import { fetchScheduleEntriesForProject } from './supabaseSchedule'
import type { Project, ProjectListItem, ProjectFull } from '@/types'

// ===== PROJECTS =====

export async function fetchProjects(orgId: string): Promise<ProjectListItem[]> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        zones (
          *,
          zone_materials (
            material_id,
            materials (name)
          ),
          zone_equipment (
            equipment_id,
            equipment (name)
          )
        )
      `)
      .eq('org_id', orgId)

    if (error) throw error

    // Batch-fetch task counts and crew assignment counts for all projects
    const [taskSums, crewCounts, nextDates] = await Promise.all([
      fetchTaskSummaries(orgId),
      fetchCrewAssignmentCounts(orgId),
      fetchNextScheduledDates(orgId),
    ]);

    return (data || []).map(project => {
      const camelProject = toCamelCase(project) as Record<string, unknown>

      // Map DB column names → frontend field names for project
      camelProject.totalArea = (camelProject.totalAreaSqft as number) ?? (camelProject.totalArea as number) ?? 0
      camelProject.client = camelProject.clientId ? '' : ''

      // Build zones with materials and equipment
      const zones = camelProject.zones as Array<Record<string, unknown>> | undefined;
      camelProject.zones = (zones || []).map((zone) => {
        const zoneMats = zone.zoneMaterials as Array<Record<string, unknown>> | undefined;
        zone.materials = (zoneMats || []).map((zm) => ({
          materialId: zm.materialId,
          name: (zm.materials as Record<string, unknown>)?.name || ''
        }))
        const zoneEquip = zone.zoneEquipment as Array<Record<string, unknown>> | undefined;
        zone.equipment = (zoneEquip || []).map((ze) => ({
          equipId: ze.equipmentId,
          name: (ze.equipment as Record<string, unknown>)?.name || ''
        }))
        delete zone.zoneMaterials
        delete zone.zoneEquipment
        // Map DB zone column names → frontend field names
        zone.area = (zone.areaSqft as number) ?? (zone.area as number) ?? 0
        zone.perimeter = (zone.perimeterLnft as number) ?? (zone.perimeter as number) ?? 0
        zone.sequence = (zone.sequenceNumber as number) ?? (zone.sequence as number) ?? 0
        zone.crew = (zone.crewAssignment as string) ?? (zone.crew as string) ?? ''
        return zone
      })

      // Parse checklist from JSONB
      if (typeof camelProject.checklist === 'string') {
        camelProject.checklist = JSON.parse(camelProject.checklist as string)
      }

      // Parse project-level materials from JSONB
      if (typeof camelProject.materials === 'string') {
        try { camelProject.materials = JSON.parse(camelProject.materials as string) } catch { camelProject.materials = [] }
      }
      if (!Array.isArray(camelProject.materials)) {
        camelProject.materials = []
      }

      // Attach summary counts
      const projectId = camelProject.id as string;
      const ts = taskSums[projectId];
      camelProject.taskCount = ts?.total ?? 0;
      camelProject.completedTaskCount = ts?.completed ?? 0;
      camelProject.crewCount = crewCounts[projectId] ?? 0;
      camelProject.nextScheduledDate = nextDates[projectId] ?? null;

      return camelProject as unknown as ProjectListItem
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('fetchProjects error:', message)
    return []
  }
}

/** Fetch a single project with its complete relational graph */
export async function fetchProjectFull(orgId: string, projectId: string): Promise<ProjectFull | null> {
  try {
    // Fetch project + all related entities in parallel
    const [projectResult, tasks, subcontractors, permits, crewAssignments, scheduleEntries, siteConditions] = await Promise.all([
      supabase
        .from('projects')
        .select(`
          *,
          zones (
            *,
            zone_materials (material_id, materials (name)),
            zone_equipment (equipment_id, equipment (name))
          )
        `)
        .eq('org_id', orgId)
        .eq('id', projectId)
        .single(),
      fetchProjectTasks(orgId, projectId),
      fetchProjectSubcontractors(orgId, projectId),
      fetchProjectPermits(orgId, projectId),
      fetchProjectCrewAssignments(orgId, projectId),
      fetchScheduleEntriesForProject(orgId, projectId),
      fetchProjectSiteConditions(orgId, projectId),
    ]);

    if (projectResult.error) throw projectResult.error;
    const project = projectResult.data;

    const camelProject = toCamelCase(project) as Record<string, unknown>;
    camelProject.totalArea = (camelProject.totalAreaSqft as number) ?? (camelProject.totalArea as number) ?? 0;
    camelProject.client = camelProject.clientId ? '' : '';

    // Build zones
    const zones = camelProject.zones as Array<Record<string, unknown>> | undefined;
    camelProject.zones = (zones || []).map((zone) => {
      const zoneMats = zone.zoneMaterials as Array<Record<string, unknown>> | undefined;
      zone.materials = (zoneMats || []).map((zm) => ({
        materialId: zm.materialId,
        name: (zm.materials as Record<string, unknown>)?.name || ''
      }));
      const zoneEquip = zone.zoneEquipment as Array<Record<string, unknown>> | undefined;
      zone.equipment = (zoneEquip || []).map((ze) => ({
        equipId: ze.equipmentId,
        name: (ze.equipment as Record<string, unknown>)?.name || ''
      }));
      delete zone.zoneMaterials;
      delete zone.zoneEquipment;
      zone.area = (zone.areaSqft as number) ?? (zone.area as number) ?? 0;
      zone.perimeter = (zone.perimeterLnft as number) ?? (zone.perimeter as number) ?? 0;
      zone.sequence = (zone.sequenceNumber as number) ?? (zone.sequence as number) ?? 0;
      zone.crew = (zone.crewAssignment as string) ?? (zone.crew as string) ?? '';
      return zone;
    });

    if (typeof camelProject.checklist === 'string') {
      camelProject.checklist = JSON.parse(camelProject.checklist as string);
    }
    if (typeof camelProject.materials === 'string') {
      try { camelProject.materials = JSON.parse(camelProject.materials as string); } catch { camelProject.materials = []; }
    }
    if (!Array.isArray(camelProject.materials)) {
      camelProject.materials = [];
    }

    return {
      ...camelProject,
      tasks,
      subcontractors,
      permits,
      crewAssignments,
      scheduleEntries,
      siteConditions,
    } as unknown as ProjectFull;
  } catch (err: unknown) {
    onSupabaseError('SELECT', 'projects (full)', err);
    return null;
  }
}

// ===== SUMMARY HELPERS (used by fetchProjects for ProjectListItem counts) =====

async function fetchCrewAssignmentCounts(
  orgId: string
): Promise<Record<string, number>> {
  try {
    const { data, error } = await supabase
      .from('project_crew_assignments')
      .select('project_id')
      .eq('org_id', orgId);

    if (error) throw error;

    const counts: Record<string, number> = {};
    for (const row of data || []) {
      counts[row.project_id] = (counts[row.project_id] || 0) + 1;
    }
    return counts;
  } catch {
    return {};
  }
}

async function fetchNextScheduledDates(
  orgId: string
): Promise<Record<string, string>> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('schedule_entries')
      .select('project_id, scheduled_date')
      .eq('org_id', orgId)
      .gte('scheduled_date', today)
      .order('scheduled_date', { ascending: true });

    if (error) throw error;

    const nextDates: Record<string, string> = {};
    for (const row of data || []) {
      if (!nextDates[row.project_id]) {
        nextDates[row.project_id] = row.scheduled_date;
      }
    }
    return nextDates;
  } catch {
    return {};
  }
}

export async function createProject(project: Omit<Project, 'id' | 'createdAt'>, id: string, orgId: string): Promise<Project | null> {
  try {
    const { zones, materials: projectMaterials, ...projectData } = project as Record<string, unknown>
    const snakeData = toSnakeCase(projectData) as Record<string, unknown>
    snakeData.id = id
    snakeData.org_id = orgId
    snakeData.checklist = (project as Record<string, unknown>).checklist // Keep as object, Supabase will handle JSONB
    // Field fixups: frontend name → DB column name
    delete snakeData.client       // string, DB expects client_id UUID FK (unused)
    delete snakeData.is_demo      // frontend-only flag, no DB column
    snakeData.total_area_sqft = snakeData.total_area; delete snakeData.total_area
    if (snakeData.start_date === '') snakeData.start_date = null
    if (snakeData.target_date === '') snakeData.target_date = null


    const { data, error } = await supabase
      .from('projects')
      .insert([snakeData])
      .select()
      .single()

    if (error) throw error

    // Persist project-level materials if provided
    if (projectMaterials && (projectMaterials as unknown[]).length > 0) {
      await supabase
        .from('projects')
        .update({ materials: projectMaterials })
        .eq('id', id)
    }

    // Write zones to the zones table now that the project row exists
    const zonesArr = zones as Array<Record<string, unknown>> | undefined;
    if (zonesArr && zonesArr.length > 0) {
      for (const zoneRaw of zonesArr) {
        const { id: _zoneId, createdAt: _createdAt, ...zoneData } = zoneRaw;
        const result = await createZone(id, zoneData as Omit<import('@/types').Zone, 'id' | 'createdAt'>, orgId)
        if (!result) {
          console.warn(`[TF-SUPABASE] Zone "${zoneData.name}" failed to persist for project ${id}`)
        }
      }
    }

    return {
      ...toCamelCase(data),
      zones: []
    } as unknown as Project
  } catch (err: unknown) {
    onSupabaseError('INSERT', 'projects', err)
    return null
  }
}

export async function updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
  try {
    const { zones, ...updateData } = updates
    const snakeData = toSnakeCase(updateData as unknown as Record<string, unknown>) as Record<string, unknown>
    if (updateData.checklist) {
      snakeData.checklist = updateData.checklist
    }
    // Field fixups
    if ('client' in snakeData) delete snakeData.client
    if ('total_area' in snakeData) { snakeData.total_area_sqft = snakeData.total_area; delete snakeData.total_area }
    if ('is_demo' in snakeData) delete snakeData.is_demo

    const { data, error } = await supabase
      .from('projects')
      .update(snakeData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    const project = toCamelCase(data) as unknown as Project
    project.zones = []
    return project
  } catch (err: unknown) {
    onSupabaseError('UPDATE', 'projects', err)
    return null
  }
}

export async function deleteProject(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }
    return true
  } catch (err: unknown) {
    onSupabaseError('DELETE', 'projects', err)
    return false
  }
}
