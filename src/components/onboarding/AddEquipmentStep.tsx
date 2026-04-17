import React, { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { searchEquipment, formatEquipmentDisplay } from '@/lib/equipmentKnowledge'
import type { Equipment } from '@/types'
import type { EquipmentTemplate } from '@/lib/equipmentKnowledge'

interface EquipmentForm {
  name: string
  makeModel: string
  type: string
  hourlyCost: number | null
}

const EMPTY_FORM: EquipmentForm = { name: '', makeModel: '', type: '', hourlyCost: null }

interface AddEquipmentStepProps {
  equipment: Equipment[]
  onAddEquipment: (equip: Omit<Equipment, 'id'>) => Promise<void>
  onAddSampleData: () => Promise<void>
  onBack: () => void
  onSkip: () => void
  onContinue: () => void
  isSaving?: boolean
}

export const AddEquipmentStep: React.FC<AddEquipmentStepProps> = ({
  equipment,
  onAddEquipment,
  onAddSampleData,
  onBack,
  onSkip,
  onContinue,
  isSaving = false,
}) => {
  const [form, setForm] = useState<EquipmentForm>({ ...EMPTY_FORM })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isAdding, setIsAdding] = useState(false)
  const [lastAddedName, setLastAddedName] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<EquipmentTemplate[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMakeModelChange = (value: string) => {
    setForm(prev => ({ ...prev, makeModel: value, name: value }))
    setErrors(prev => ({ ...prev, makeModel: '' }))

    if (value.length > 0) {
      const results = searchEquipment(value)
      setSuggestions(results)
      setShowSuggestions(results.length > 0)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  const selectSuggestion = (suggestion: EquipmentTemplate) => {
    const displayName = `${suggestion.make} ${suggestion.model}`
    setForm({
      name: displayName,
      makeModel: displayName,
      type: suggestion.type,
      hourlyCost: suggestion.typicalHourlyRate,
    })
    setSuggestions([])
    setShowSuggestions(false)
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!form.makeModel || form.makeModel.trim().length === 0) {
      newErrors.makeModel = 'Equipment name/model is required'
    }
    if (!form.type || form.type.trim().length === 0) {
      newErrors.type = 'Equipment type is required'
    }
    if (form.hourlyCost !== null && form.hourlyCost < 0) {
      newErrors.hourlyCost = 'Hourly cost must be non-negative'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return false
    }
    return true
  }

  const handleAddEquipment = async () => {
    if (!validateForm() || isAdding) return

    setIsAdding(true)
    setErrors({})
    const addingName = form.name || form.makeModel
    try {
      await onAddEquipment({
        name: addingName,
        makeModel: form.makeModel,
        type: form.type,
        hourlyCost: form.hourlyCost,
        equipmentType: form.type,
        year: null,
        serial: '',
        plate: '',
        status: 'available',
        assignedProject: '',
        location: '',
        operator: '',
        hours: 0,
        serviceDueHours: 500,
        lastService: new Date().toISOString().split('T')[0],
        nextService: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        maintNotes: '',
        value: 0,
        dailyRate: form.hourlyCost ? form.hourlyCost * 8 : 0,
        insurance: '',
        insuranceExpiry: '',
        regExpiry: '',
        inspectionDue: '',
        notes: '',
        capabilities: [],
        maintenanceLog: [],
      })
      setLastAddedName(addingName)
      setForm({ ...EMPTY_FORM })
      // Focus back on input for rapid multi-add
      setTimeout(() => inputRef.current?.focus(), 100)
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'Failed to add equipment' })
    } finally {
      setIsAdding(false)
    }
  }

  const handleSampleData = async () => {
    setIsAdding(true)
    try {
      await onAddSampleData()
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'Failed to load sample data' })
    } finally {
      setIsAdding(false)
    }
  }

  // Handle Enter key in form
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !showSuggestions) {
      e.preventDefault()
      handleAddEquipment()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[24px] font-[700] text-[var(--text-primary)] mb-2">
          Add equipment
        </h2>
        <p className="text-[14px] text-[var(--text-secondary)]">
          Just the basics — model, type, and rate. You'll be prompted to add details like maintenance, insurance, and hours after setup.
        </p>
      </div>

      {errors.submit && (
        <div className="p-3 rounded-[8px] bg-[rgba(220,38,38,.15)] border border-[var(--red)] text-[var(--red-l)] text-[13px]">
          {errors.submit}
        </div>
      )}

      {/* Equipment list */}
      {equipment.length > 0 && (
        <div className="bg-[var(--surface-card)] rounded-[8px] border border-[var(--border-default)] p-4 space-y-2">
          <p className="text-[12px] text-[var(--text-tertiary)] uppercase font-[600]">
            Added equipment ({equipment.length})
          </p>
          <div className="space-y-1">
            {equipment.map((eq) => (
              <div
                key={eq.id}
                className={`flex items-center justify-between p-2 rounded-[6px] text-[13px] transition-colors ${
                  lastAddedName && eq.makeModel === lastAddedName
                    ? 'bg-[var(--surface-selected)] border border-[var(--brand-primary)]'
                    : 'bg-[var(--surface-hover)]'
                }`}
              >
                <span className="text-[var(--text-primary)]">{eq.makeModel || eq.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[var(--text-tertiary)] text-[12px]">{eq.type}</span>
                  <span className="text-[var(--text-tertiary)]">{eq.hourlyCost ? `$${eq.hourlyCost}/hr` : ''}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add form */}
      <div
        className="bg-[var(--surface-card)] rounded-[8px] border border-[var(--border-default)] p-4 space-y-3"
        onKeyDown={handleKeyDown}
      >
        <p className="text-[12px] text-[var(--text-tertiary)] uppercase font-[600]">
          Quick add
        </p>

        <div className="relative">
          <Input
            ref={inputRef}
            label="Make & Model"
            placeholder="e.g., Bobcat S650, CAT 305, STIHL BR 600"
            value={form.makeModel}
            onChange={(e) => handleMakeModelChange(e.target.value)}
            onFocus={() => form.makeModel.length > 0 && suggestions.length > 0 && setShowSuggestions(true)}
            error={errors.makeModel}
            disabled={isAdding || isSaving}
          />

          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute top-full left-0 right-0 mt-1 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[8px] shadow-[var(--shadow-panel)] z-10 max-h-[240px] overflow-y-auto"
            >
              {suggestions.map((suggestion, idx) => (
                <button
                  key={`${suggestion.make}-${suggestion.model}-${idx}`}
                  onClick={() => selectSuggestion(suggestion)}
                  className="w-full text-left p-3 text-[13px] hover:bg-[var(--surface-hover)] border-b border-[var(--border-default)] last:border-b-0 transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  {formatEquipmentDisplay(suggestion)}
                </button>
              ))}
            </div>
          )}
        </div>

        <Input
          label="Equipment Type"
          placeholder="e.g., Skid Steer Loader, Excavator, Mower"
          value={form.type}
          onChange={(e) => {
            setForm(prev => ({ ...prev, type: e.target.value }))
            setErrors(prev => ({ ...prev, type: '' }))
          }}
          error={errors.type}
          disabled={isAdding || isSaving}
        />

        <Input
          label="Hourly Rate ($/hr, optional)"
          placeholder="e.g., 75"
          type="number"
          inputMode="decimal"
          value={form.hourlyCost ?? ''}
          onChange={(e) => {
            const val = e.target.value ? parseFloat(e.target.value) : null
            setForm(prev => ({ ...prev, hourlyCost: val }))
            setErrors(prev => ({ ...prev, hourlyCost: '' }))
          }}
          error={errors.hourlyCost}
          hint="Leave blank and fill in later if unsure"
          disabled={isAdding || isSaving}
        />

        <Button
          variant="primary"
          onClick={handleAddEquipment}
          className="w-full h-[44px]"
          disabled={isAdding || isSaving}
          loading={isAdding}
        >
          {isAdding ? 'Adding...' : 'Add Equipment'}
        </Button>
      </div>

      {/* Actions */}
      {equipment.length === 0 && (
        <Button
          variant="secondary"
          onClick={handleSampleData}
          className="w-full h-[44px]"
          disabled={isAdding || isSaving}
          loading={isSaving}
        >
          Try with sample equipment
        </Button>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        <Button
          variant="ghost"
          onClick={onBack}
          className="h-[44px] px-6"
          disabled={isAdding || isSaving}
        >
          &larr; Back
        </Button>
        <div className="flex-1" />
        <Button
          variant="ghost"
          onClick={onSkip}
          className="h-[44px]"
          disabled={isAdding || isSaving}
        >
          Skip
        </Button>
      </div>

      {equipment.length > 0 && (
        <Button
          variant="primary"
          onClick={onContinue}
          className="w-full h-[48px]"
          disabled={isAdding || isSaving}
        >
          Continue
        </Button>
      )}
    </div>
  )
}
