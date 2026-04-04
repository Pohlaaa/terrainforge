import { supabase } from './supabase'
import { createProject, deleteProject } from './supabaseProjects'
import { createMaterial, deleteMaterial } from './supabaseMaterials'
import { createCrewMember, deleteCrewMember } from './supabaseCrew'
import { createEquipment, deleteEquipment } from './supabaseEquipment'
import { createScheduleEntry, deleteScheduleEntry } from './supabaseSchedule'
import { createProjectTask, deleteProjectTask } from './supabaseProjectDetails'

// ===== SAMPLE DATA =====

interface SampleIds {
  projects: string[];
  crew: string[];
  equipment: string[];
  materials: string[];
  tasks: string[];
  scheduleEntries: string[];
}

export async function insertSampleData(orgId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { getSampleProjects, getSampleCrew, getSampleEquipment, getSampleMaterials, getSampleTasks, getSampleZoneMaterials, getSampleScheduleEntries } = await import('@/lib/sampleData');
    const ids: SampleIds = { projects: [], crew: [], equipment: [], materials: [], tasks: [], scheduleEntries: [] };

    // Materials first (no deps) — build name→id lookup for zone_materials
    const materialNameToId: Record<string, string> = {};
    for (const mat of getSampleMaterials()) {
      const id = crypto.randomUUID();
      const result = await createMaterial(mat, id, orgId);
      if (result) {
        ids.materials.push(id);
        materialNameToId[mat.name] = id;
      }
    }

    // Crew — build name→id lookup for schedule entries
    const crewNameToId: Record<string, string> = {};
    for (const member of getSampleCrew()) {
      const id = crypto.randomUUID();
      const result = await createCrewMember(member, id, orgId);
      if (result) {
        ids.crew.push(id);
        crewNameToId[member.name] = id;
      }
    }

    // Equipment — build name→id lookup for schedule entry equipment assignment
    const equipmentNameToId: Record<string, string> = {};
    for (const equip of getSampleEquipment()) {
      const id = crypto.randomUUID();
      const result = await createEquipment(equip, id, orgId);
      if (result) {
        ids.equipment.push(id);
        equipmentNameToId[equip.name] = id;
      }
    }

    // Projects (with zones) + zone_materials + tasks
    const sampleTasks = getSampleTasks();
    const zoneMaterialMap = getSampleZoneMaterials();
    const projectNameToId: Record<string, string> = {};

    for (const proj of getSampleProjects()) {
      const id = crypto.randomUUID();
      const result = await createProject(proj, id, orgId);
      if (result) {
        ids.projects.push(id);
        projectNameToId[proj.name] = id;

        // Fetch the zones that were just created for this project
        const { data: createdZones } = await supabase
          .from('zones')
          .select('id, name')
          .eq('project_id', id)
          .eq('org_id', orgId);

        // Create zone_materials linkages
        const projectZoneMats = zoneMaterialMap[proj.name];
        if (createdZones && projectZoneMats) {
          for (const zone of createdZones) {
            const matNames = projectZoneMats[zone.name];
            if (matNames) {
              const insertRows = matNames
                .map(name => materialNameToId[name])
                .filter(Boolean)
                .map(materialId => ({
                  zone_id: zone.id,
                  material_id: materialId,
                  quantity: 1,
                }));
              if (insertRows.length > 0) {
                await supabase.from('zone_materials').insert(insertRows);
              }
            }
          }
        }

        // Insert tasks for this project
        const tasks = sampleTasks[proj.name];
        if (tasks) {
          for (const task of tasks) {
            const taskId = crypto.randomUUID();
            const taskResult = await createProjectTask(
              {
                orgId,
                projectId: id,
                zoneId: null,
                name: task.name,
                description: task.description,
                phase: task.phase,
                sequenceNumber: task.sequenceNumber,
                status: task.status,
                assignedCrewId: null,
                estimatedHours: null,
                actualHours: null,
                dependsOn: [],
                scheduledDate: null,
                completedAt: null,
                aiGenerated: task.aiGenerated,
                aiConfidence: null,
              },
              taskId,
              orgId,
            );
            if (taskResult) ids.tasks.push(taskId);
          }
        }
      }
    }

    // Schedule entries — link crew to projects with relative dates
    for (const entry of getSampleScheduleEntries()) {
      const crewId = crewNameToId[entry.crewName];
      const projectId = projectNameToId[entry.projectName];
      if (!crewId || !projectId) continue;

      const schedDate = new Date();
      schedDate.setDate(schedDate.getDate() + entry.dayOffset);
      const dateStr = schedDate.toISOString().split('T')[0];

      const schedId = crypto.randomUUID();
      const equipId = entry.equipmentName ? (equipmentNameToId[entry.equipmentName] || null) : null;
      await createScheduleEntry(
        {
          orgId,
          projectId,
          crewMemberId: crewId,
          equipmentId: equipId,
          scheduledDate: dateStr,
          startTime: entry.startTime,
          endTime: entry.endTime,
          notes: entry.notes,
          status: entry.status,
        },
        schedId,
        orgId,
      );
      ids.scheduleEntries.push(schedId);
    }

    // Persist IDs for cleanup
    localStorage.setItem('tf-sample-ids', JSON.stringify(ids));
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

export async function clearSampleData(orgId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const raw = localStorage.getItem('tf-sample-ids');
    if (!raw) return { success: true };
    const ids: SampleIds = JSON.parse(raw);

    // Delete in reverse dependency order:
    // 1. schedule_entries (references project_id, crew_member_id)
    if (ids.scheduleEntries?.length) {
      for (const id of ids.scheduleEntries) {
        await deleteScheduleEntry(id);
      }
    }
    // 2. tasks (references project_id)
    if (ids.tasks?.length) {
      for (const id of ids.tasks) {
        await deleteProjectTask(id);
      }
    }
    // 3. zone_materials (references zone_id, material_id) — must delete before zones/projects/materials
    if (ids.projects?.length) {
      const { data: zones } = await supabase
        .from('zones')
        .select('id')
        .in('project_id', ids.projects)
        .eq('org_id', orgId);
      if (zones?.length) {
        const zoneIds = zones.map((z: { id: string }) => z.id);
        await supabase.from('zone_materials').delete().in('zone_id', zoneIds);
      }
    }
    // 4. projects (zones cascade via FK)
    for (const id of ids.projects) {
      await deleteProject(id);
    }
    // 5. equipment
    for (const id of ids.equipment) {
      await deleteEquipment(id);
    }
    // 6. crew
    for (const id of ids.crew) {
      await deleteCrewMember(id);
    }
    // 7. materials (last — zone_materials already cleaned up)
    for (const id of ids.materials) {
      await deleteMaterial(id);
    }

    localStorage.removeItem('tf-sample-ids');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

// ===== DIAGNOSTICS =====

export async function diagnoseUserRole(): Promise<void> {
  if (!import.meta.env.DEV) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('[TF-DIAG] No authenticated user');
      return;
    }

    const { data: memberships, error } = await supabase
      .from('organization_members')
      .select('org_id, role')
      .eq('user_id', user.id);

    if (error) {
      console.warn('[TF-DIAG] Could not fetch memberships:', error.message);
      return;
    }

    if (memberships && memberships.length > 0) {
      const hasAdmin = memberships.some((m: Record<string, unknown>) => m.role === 'admin');
      const hasForeman = memberships.some((m: Record<string, unknown>) => m.role === 'foreman');

      if (!hasAdmin && !hasForeman) {
        console.warn('[TF-DIAG] ⚠️  User has no admin or foreman role. Zone and crew operations will be blocked by RLS.');
        console.warn('[TF-DIAG] Current roles:', memberships.map((m: Record<string, unknown>) => m.role).join(', '));
        console.warn('[TF-DIAG] Fix: Run in Supabase SQL Editor:');
        console.warn(`[TF-DIAG]   UPDATE organization_members SET role = 'admin' WHERE user_id = '${user.id}';`);
      }
    } else {
      console.warn('[TF-DIAG] ⚠️  User has NO organization memberships. All RLS checks will fail.');
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.warn('[TF-DIAG] Role check failed:', message);
  }
}
