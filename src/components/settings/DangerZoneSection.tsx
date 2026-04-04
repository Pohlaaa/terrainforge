import React, { useState } from 'react'
import { useOrgStore } from '@/stores/orgStore'
import { useProjectStore } from '@/stores/projectStore'
import { useMaterialStore } from '@/stores/materialStore'
import { useCrewStore } from '@/stores/crewStore'
import { useEquipmentStore } from '@/stores/equipmentStore'
import { useScheduleStore } from '@/stores/scheduleStore'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/Button'
import { SectionHeading } from './SectionHeading'
import { toast } from '@/hooks/useToast'

export const DangerZoneSection: React.FC = () => {
  const { org, clearSampleData } = useOrgStore()
  const { projects, setProjects, setActiveProject, fetchProjects } = useProjectStore()
  const { setMaterials, fetchMaterials } = useMaterialStore()
  const { setCrew, fetchCrew } = useCrewStore()
  const { setEquipment, fetchEquipment } = useEquipmentStore()

  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [sampleLoading, setSampleLoading] = useState(false)
  const hasDemoData = projects.some(p => p.isDemo === true)
  const hasSampleData = localStorage.getItem('tf-sample-ids') !== null

  function handleClearDemoData() {
    setProjects(projects.filter(p => !p.isDemo))
    setActiveProject(null)
    setMaterials([])
    setCrew([])
    setEquipment([])
    setShowClearConfirm(false)
  }

  async function handleClearSampleData() {
    if (!org?.id) return
    setSampleLoading(true)
    const result = await clearSampleData()
    if (result.success) {
      const monday = new Date()
      const day = monday.getDay()
      monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1))
      const weekStart = monday.toISOString().split('T')[0]
      await Promise.all([
        fetchProjects(),
        fetchCrew(),
        fetchEquipment(),
        fetchMaterials(),
        useScheduleStore.getState().fetchSchedule(weekStart),
      ])
      localStorage.setItem('tf-setup-dismissed', 'true')
      toast.success('Sample data cleared')
    } else {
      toast.error(`Failed to clear sample data: ${result.error}`)
    }
    setSampleLoading(false)
    setShowClearConfirm(false)
  }

  return (
    <div>
      <SectionHeading title="Danger Zone" subtitle="Irreversible actions" />
      <div className="p-5 rounded-xl border border-[var(--status-red)] bg-[var(--surface-card)] shadow-[var(--shadow-sm)]">
        {hasDemoData && (
          <div className="mb-4 pb-4 border-b border-[var(--border-light)]">
            <div className="text-[14px] font-[500] text-[var(--text-primary)] mb-1">Clear Demo Data</div>
            <div className="text-[13px] text-[var(--text-secondary)] mb-3 leading-relaxed">
              Remove demo projects, materials, crew, and equipment that were loaded automatically.
            </div>
            <Button variant="danger" size="sm" onClick={() => setShowClearConfirm(true)}>
              Clear Demo Data
            </Button>
          </div>
        )}
        {hasSampleData ? (
          <div>
            <div className="text-[14px] font-[500] text-[var(--text-primary)] mb-1">Delete Sample Data</div>
            <div className="text-[13px] text-[var(--text-secondary)] mb-3 leading-relaxed">
              Remove all sample company data (projects, crew, equipment, materials). Your account settings and billing will not be affected.
            </div>
            <Button variant="danger" size="sm" loading={sampleLoading} onClick={() => setShowClearConfirm(true)}>
              Delete Sample Data
            </Button>
          </div>
        ) : !hasDemoData ? (
          <div className="text-[13px] text-[var(--text-secondary)]">
            No sample or demo data to remove.
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        isOpen={showClearConfirm}
        title={hasSampleData ? 'Delete Sample Data' : 'Clear Demo Data'}
        message="This will remove all sample/demo projects, materials, crew, and equipment. Your account settings and billing will not be affected. This cannot be undone."
        confirmText="Delete"
        confirmVariant="danger"
        onConfirm={hasSampleData ? handleClearSampleData : handleClearDemoData}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  )
}
