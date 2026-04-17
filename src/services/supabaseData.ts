// ===== BARREL RE-EXPORT =====
// All Supabase CRUD operations split into domain modules.
// This file re-exports everything so existing imports continue to work.

export { setSupabaseErrorReporter, toCamelCase, toSnakeCase, sanitizeTimestamps, onSupabaseError } from './supabaseCore'

export { fetchProjects, fetchProjectFull, createProject, updateProject, deleteProject, updateProjectMaterials } from './supabaseProjects'

export { createZone, updateZone, deleteZone, setZoneMaterials, setZoneEquipment, fetchZoneMaterialDetails } from './supabaseZones'

export { fetchMaterials, createMaterial, updateMaterial, deleteMaterial } from './supabaseMaterials'

export { fetchCrew, createCrewMember, updateCrewMember, deleteCrewMember } from './supabaseCrew'

export { fetchEquipment, createEquipment, updateEquipment, deleteEquipment, addMaintenanceEntry } from './supabaseEquipment'

export { fetchScheduleEntries, fetchScheduleEntriesForProject, createScheduleEntry, updateScheduleEntry, deleteScheduleEntry } from './supabaseSchedule'

export {
  fetchProjectCrewAssignments, fetchAllProjectCrewAssignments,
  createProjectCrewAssignment, deleteProjectCrewAssignment,
  fetchCrewStatus, upsertCrewStatus, fetchAllCrewStatuses,
  fetchChecklistProgress, saveChecklistStep, removeChecklistStep, fetchChecklistProgressCounts,
  uploadCrewPhoto, fetchCrewPhotos, getPhotoUrl, deleteCrewPhoto,
} from './supabaseCrewOps'
export type { CrewPhoto } from './supabaseCrewOps'

export {
  fetchTaskSummaries,
  fetchProjectTasks, createProjectTask, updateProjectTask, deleteProjectTask,
  fetchProjectSiteConditions, createProjectSiteCondition, updateProjectSiteCondition, deleteProjectSiteCondition,
  fetchProjectSubcontractors, createProjectSubcontractor, updateProjectSubcontractor, deleteProjectSubcontractor,
  fetchProjectDocuments, createProjectDocument, updateProjectDocument, deleteProjectDocument,
  fetchProjectPermits, createProjectPermit, updateProjectPermit, deleteProjectPermit,
} from './supabaseProjectDetails'

export { insertSampleData, clearSampleData, diagnoseUserRole } from './supabaseSampleData'

export {
  fetchSuppliers, createSupplier, updateSupplier, deleteSupplier,
  fetchSupplierPrices, upsertSupplierPrice, deleteSupplierPrice, getPreferredPrice,
  recordPriceHistory, fetchPriceHistory,
} from './supabaseSuppliers'

export {
  fetchQuoteRequests, createQuoteRequest, updateQuoteRequestStatus,
  fetchQuoteRequestItems, updateQuoteRequestItem,
} from './supabaseQuotes'

export {
  fetchProjectElements, createProjectElement, updateProjectElement, deleteProjectElement,
  fetchElementMaterials, createElementMaterial, updateElementMaterial, deleteElementMaterial,
  deleteElementMaterialsByElement,
} from './supabaseElements'
