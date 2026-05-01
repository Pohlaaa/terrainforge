/**
 * ElementEditSheet — touch-first per-element editor.
 *
 * Tap an element on the property canvas → this sheet slides up (mobile)
 * or anchors right (desktop) with:
 *   - Element name (editable inline)
 *   - Element type (dropdown)
 *   - Dimensions: Length × Width × Height (or Linear ft × Height for
 *     linear elements). Each input has ± step buttons for thumb tapping
 *     plus a free-text number input.
 *   - Materials: list of attached materials with qty + cost. Tap to
 *     remove; "+ Add material" pulls from the org library + AI
 *     suggestions.
 *   - Cost summary: per-element rollup at the bottom.
 *
 * Designed for both the wizard (WizardElement shape) and the project
 * dashboard (ProjectElement shape). The component is structural —
 * callers map their data into props and own state mutations.
 *
 * Accessibility / touch:
 *   - 44px minimum tap targets per Apple HIG
 *   - Number inputs use `inputmode="decimal"` so iOS shows a numeric
 *     keypad
 *   - Backdrop click + Escape both close
 */

import React, { useEffect, useState } from 'react'
import type { ElementType, MaterialCategory } from '@/types'
import { ELEMENT_TYPE_LABELS } from '@/lib/elements'

// ── Element shape adapter ────────────────────────────────────────────────

/**
 * Compact view of an element that this sheet edits. Wizard +
 * ProjectDashboard both map their richer types into this shape.
 */
export interface SheetElement {
  id: string
  name: string
  elementType: ElementType
  /** Length × Width OR Linear ft (depending on element type). */
  lengthFt: number | null
  widthFt: number | null
  linearFt: number | null
  heightFt: number | null
  depthIn: number | null
  /** Attached materials with current qty + line cost (computed by parent). */
  materials: SheetMaterial[]
  /** Per-element cost rollup. Computed by the parent via the materials engine. */
  estimatedCost: number
}

export interface SheetMaterial {
  id: string
  name: string
  category: MaterialCategory | string
  quantity: number
  unit: string
  unitCost: number
  lineCost: number
}

/**
 * Org library + AI-suggested materials offered when contractor taps
 * "+ Add material." Caller curates the list (typically: AI suggestions
 * for this element type ∪ org library filtered by relevant category).
 */
export interface SheetAddableMaterial {
  id: string
  name: string
  category: MaterialCategory | string
  unit: string
  unitCost: number
  source: 'library' | 'ai'
}

// ── Element-type → which dimension fields apply ─────────────────────────

interface DimConfig {
  showLengthWidth?: boolean
  showLinearFt?: boolean
  showHeightFt?: boolean
  showDepthIn?: boolean
}

const DIM_CONFIG: Record<ElementType, DimConfig> = {
  patio: { showLengthWidth: true, showDepthIn: true },
  walkway: { showLengthWidth: true, showDepthIn: true },
  driveway: { showLengthWidth: true, showDepthIn: true },
  pool_deck: { showLengthWidth: true, showDepthIn: true },
  parking_lot: { showLengthWidth: true, showDepthIn: true },
  steps_stairs: { showLengthWidth: true, showHeightFt: true },
  garden_bed: { showLengthWidth: true, showDepthIn: true },
  sod_area: { showLengthWidth: true },
  mulch_area: { showLengthWidth: true, showDepthIn: true },
  gravel_area: { showLengthWidth: true, showDepthIn: true },
  concrete_slab: { showLengthWidth: true, showDepthIn: true },
  fire_pit: { showLengthWidth: true, showHeightFt: true },
  outdoor_kitchen: { showLengthWidth: true, showHeightFt: true },
  pergola: { showLengthWidth: true, showHeightFt: true },
  drainage: { showLinearFt: true, showDepthIn: true },
  tree_planting: { showLengthWidth: true },
  shrub_planting: { showLengthWidth: true },
  irrigation_zone: { showLengthWidth: true },
  edging: { showLinearFt: true, showHeightFt: true },
  curbing: { showLinearFt: true, showHeightFt: true },
  fence: { showLinearFt: true, showHeightFt: true },
  wall: { showLinearFt: true, showHeightFt: true },
  retaining_wall: { showLinearFt: true, showHeightFt: true },
  other: { showLengthWidth: true, showLinearFt: true, showHeightFt: true, showDepthIn: true },
}

// ── Component ───────────────────────────────────────────────────────────

interface Props {
  element: SheetElement | null
  /** Called when contractor closes the sheet (backdrop tap, Escape, or X button). */
  onClose: () => void
  /** Called on every dimension/name/type change. Parent owns persistence. */
  onUpdate: (updates: Partial<SheetElement>) => void
  /** Remove the whole element. */
  onRemove?: () => void
  /** Add the given material to this element. */
  onAddMaterial: (material: SheetAddableMaterial) => void
  /** Remove a material by id. */
  onRemoveMaterial: (materialId: string) => void
  /** Materials offered in the "+ Add material" picker. */
  addableMaterials: SheetAddableMaterial[]
  /** Hide the type picker (e.g. when type is fixed in this context). */
  hideTypePicker?: boolean
}

export const ElementEditSheet: React.FC<Props> = ({
  element,
  onClose,
  onUpdate,
  onRemove,
  onAddMaterial,
  onRemoveMaterial,
  addableMaterials,
  hideTypePicker,
}) => {
  const [showAdder, setShowAdder] = useState(false)

  // Close on Escape
  useEffect(() => {
    if (!element) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [element, onClose])

  // Reset adder state when element changes
  useEffect(() => {
    setShowAdder(false)
  }, [element?.id])

  if (!element) return null

  const cfg = DIM_CONFIG[element.elementType] ?? DIM_CONFIG.other
  const showLW = cfg.showLengthWidth
  const showLin = cfg.showLinearFt
  const showH = cfg.showHeightFt
  const showD = cfg.showDepthIn

  return (
    <div className="md:hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.45)' }}
      />

      {/* Sheet — mobile bottom sheet only. Desktop keeps its inline
          sidebar editor; the sheet would duplicate state on wide
          screens and steal canvas real-estate. */}
      <div
        role="dialog"
        aria-label="Edit element"
        className="fixed z-50 flex flex-col"
        style={{
          background: 'var(--surface-card)',
          borderTop: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-panel)',
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: '85vh',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
        }}
      >
        {/* Drag handle (visual on mobile only) */}
        <div className="flex justify-center pt-2 pb-1 md:hidden">
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              background: 'var(--border-default)',
            }}
          />
        </div>

        {/* Header */}
        <div
          className="flex items-center gap-2 px-4 py-3"
          style={{ borderBottom: '1px solid var(--border-default)' }}
        >
          <input
            value={element.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Element name"
            className="flex-1 text-base font-semibold rounded-md px-2 py-1.5 min-w-0"
            style={{
              background: 'transparent',
              border: '1px solid transparent',
              color: 'var(--text-primary)',
              minHeight: 36,
            }}
            onFocus={(e) => {
              e.currentTarget.style.border = '1px solid var(--border-default)'
              e.currentTarget.style.background = 'var(--surface-bg)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.border = '1px solid transparent'
              e.currentTarget.style.background = 'transparent'
            }}
          />
          {onRemove && (
            <button
              onClick={() => {
                if (confirm(`Remove ${element.name}?`)) onRemove()
              }}
              aria-label="Remove element"
              className="cursor-pointer border-none rounded-md text-sm font-medium"
              style={{
                background: 'transparent',
                color: 'var(--status-red, #ef4444)',
                minWidth: 44,
                minHeight: 44,
              }}
            >
              Delete
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer border-none rounded-md text-base font-bold"
            style={{
              background: 'var(--surface-hover)',
              color: 'var(--text-secondary)',
              minWidth: 44,
              minHeight: 44,
            }}
          >
            ✕
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {/* Type picker */}
          {!hideTypePicker && (
            <Section label="Type">
              <select
                value={element.elementType}
                onChange={(e) => onUpdate({ elementType: e.target.value as ElementType })}
                className="w-full rounded-md px-3 cursor-pointer"
                style={{
                  background: 'var(--surface-bg)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                  minHeight: 44,
                  fontSize: 15,
                }}
              >
                {Object.entries(ELEMENT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Section>
          )}

          {/* Dimensions */}
          <Section label="Dimensions">
            <div className="grid grid-cols-1 gap-2">
              {showLW && (
                <>
                  <Stepper
                    label="Length"
                    value={element.lengthFt}
                    onChange={(v) => onUpdate({ lengthFt: v })}
                    unit="ft"
                    step={1}
                  />
                  <Stepper
                    label="Width"
                    value={element.widthFt}
                    onChange={(v) => onUpdate({ widthFt: v })}
                    unit="ft"
                    step={1}
                  />
                </>
              )}
              {showLin && (
                <Stepper
                  label="Linear length"
                  value={element.linearFt}
                  onChange={(v) => onUpdate({ linearFt: v })}
                  unit="LF"
                  step={1}
                />
              )}
              {showH && (
                <Stepper
                  label="Height"
                  value={element.heightFt}
                  onChange={(v) => onUpdate({ heightFt: v })}
                  unit="ft"
                  step={0.5}
                />
              )}
              {showD && (
                <Stepper
                  label="Depth"
                  value={element.depthIn}
                  onChange={(v) => onUpdate({ depthIn: v })}
                  unit="in"
                  step={1}
                />
              )}
            </div>
          </Section>

          {/* Materials */}
          <Section label="Materials">
            {element.materials.length === 0 && (
              <div className="text-sm italic" style={{ color: 'var(--text-tertiary)' }}>
                No materials assigned yet.
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              {element.materials.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-2 rounded-md px-3 py-2"
                  style={{
                    background: 'var(--surface-bg)',
                    border: '1px solid var(--border-default)',
                    minHeight: 48,
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {m.name}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {m.quantity.toLocaleString()} {m.unit} · ${m.lineCost.toFixed(2)}
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveMaterial(m.id)}
                    aria-label={`Remove ${m.name}`}
                    className="cursor-pointer border-none rounded-md text-base"
                    style={{
                      background: 'transparent',
                      color: 'var(--text-tertiary)',
                      minWidth: 44,
                      minHeight: 44,
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {!showAdder && (
              <button
                onClick={() => setShowAdder(true)}
                className="w-full mt-2 cursor-pointer rounded-md text-sm font-semibold border"
                style={{
                  background: 'var(--surface-bg)',
                  borderColor: 'var(--border-default)',
                  color: 'var(--brand-primary)',
                  minHeight: 44,
                }}
              >
                + Add material
              </button>
            )}

            {showAdder && (
              <div
                className="mt-2 rounded-md"
                style={{
                  background: 'var(--surface-bg)',
                  border: '1px solid var(--border-default)',
                  maxHeight: 280,
                  overflowY: 'auto',
                }}
              >
                {addableMaterials.length === 0 ? (
                  <div className="text-sm italic p-3" style={{ color: 'var(--text-tertiary)' }}>
                    No materials available. Add one in the Materials hub first.
                  </div>
                ) : (
                  addableMaterials.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        onAddMaterial(m)
                        setShowAdder(false)
                      }}
                      className="w-full flex items-center gap-2 cursor-pointer text-left border-none px-3 py-2.5"
                      style={{
                        background: 'transparent',
                        borderBottom: '1px solid var(--border-light, var(--border-default))',
                        minHeight: 48,
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          {m.name}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          {m.category} · ${m.unitCost.toFixed(2)} / {m.unit}
                        </div>
                      </div>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase"
                        style={{
                          background: m.source === 'ai' ? 'var(--brand-primary-bg, rgba(59,130,246,0.12))' : 'var(--surface-card)',
                          color: m.source === 'ai' ? 'var(--brand-primary)' : 'var(--text-tertiary)',
                        }}
                      >
                        {m.source === 'ai' ? 'AI' : 'Library'}
                      </span>
                    </button>
                  ))
                )}
                <button
                  onClick={() => setShowAdder(false)}
                  className="w-full cursor-pointer text-sm border-none p-2"
                  style={{
                    background: 'transparent',
                    color: 'var(--text-tertiary)',
                    minHeight: 40,
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </Section>
        </div>

        {/* Cost summary footer */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{
            borderTop: '1px solid var(--border-default)',
            background: 'var(--surface-bg)',
          }}
        >
          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Estimated material cost
          </span>
          <span className="text-lg font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
            ${element.estimatedCost.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  )
}

export default ElementEditSheet

// ── Internal sub-components ────────────────────────────────────────────

const Section: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <div
      className="text-[11px] font-bold uppercase tracking-wider mb-1.5"
      style={{ color: 'var(--text-tertiary)' }}
    >
      {label}
    </div>
    {children}
  </div>
)

interface StepperProps {
  label: string
  value: number | null
  onChange: (v: number | null) => void
  unit: string
  step: number
}

const Stepper: React.FC<StepperProps> = ({ label, value, onChange, unit, step }) => {
  const display = value == null ? '' : String(value)

  function handleStep(delta: number) {
    const current = value ?? 0
    const next = Math.max(0, Math.round((current + delta) * 100) / 100)
    onChange(next)
  }

  return (
    <div
      className="flex items-center gap-2 rounded-md px-3 py-2"
      style={{
        background: 'var(--surface-bg)',
        border: '1px solid var(--border-default)',
        minHeight: 56,
      }}
    >
      <span className="text-sm font-medium flex-shrink-0" style={{ color: 'var(--text-secondary)', minWidth: 70 }}>
        {label}
      </span>
      <button
        onClick={() => handleStep(-step)}
        aria-label={`Decrease ${label}`}
        className="cursor-pointer border-none rounded-md text-lg font-bold flex-shrink-0"
        style={{
          background: 'var(--surface-card)',
          color: 'var(--text-primary)',
          width: 44,
          height: 44,
        }}
      >
        −
      </button>
      <input
        type="text"
        inputMode="decimal"
        value={display}
        onChange={(e) => {
          const raw = e.target.value.trim()
          if (raw === '') {
            onChange(null)
            return
          }
          const n = Number(raw)
          if (Number.isFinite(n) && n >= 0) onChange(n)
        }}
        placeholder="0"
        className="flex-1 text-center text-base font-semibold rounded-md min-w-0"
        style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border-default)',
          color: 'var(--text-primary)',
          minHeight: 44,
          padding: '0 8px',
        }}
      />
      <button
        onClick={() => handleStep(step)}
        aria-label={`Increase ${label}`}
        className="cursor-pointer border-none rounded-md text-lg font-bold flex-shrink-0"
        style={{
          background: 'var(--surface-card)',
          color: 'var(--text-primary)',
          width: 44,
          height: 44,
        }}
      >
        +
      </button>
      <span className="text-xs font-medium flex-shrink-0" style={{ color: 'var(--text-tertiary)', minWidth: 24 }}>
        {unit}
      </span>
    </div>
  )
}
