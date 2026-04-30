/**
 * EngineMathPanel — jbluhm-V6 "backdoor" / debug view.
 *
 * jbluhm asked: "We'll need a back door easily accessible so I can
 * see what conversion rates the program is using, like sqft to units
 * of said product. I think this will need a lot of testing as in I'll
 * need to see in a chart what the program uses."
 *
 * This panel surfaces, for every material in the org's library:
 *   - the computation model (AREA_COVERAGE, UNIT_COVERAGE, LINEAR, etc.)
 *   - the raw computeParams (coverage, depth_in, length_per_unit_ft, ...)
 *   - an example output: given test dimensions (sqft + linearFt), what
 *     the engine computes as the raw qty, the wasted qty, the rounded
 *     purchase qty, and the resulting cost
 *
 * Lets the contractor sanity-check that the engine isn't suggesting,
 * e.g., 30 boxes of edging spikes for a 60 LF run. Also useful for
 * the engine maintainer to spot wrong defaults in the seed catalog.
 */

import React, { useMemo, useState } from 'react'
import { Modal } from '@/components/shared/Modal'
import type { Material, ProjectElement, ElementType } from '@/types'
import {
  computeElementMaterial,
  applyWaste,
  roundToPurchaseUnit,
} from '@/materials-engine'

interface Props {
  isOpen: boolean
  onClose: () => void
  materials: Material[]
}

/**
 * Build a synthetic project element for the test inputs. The engine's
 * `computeElementMaterial` reads .lengthFt / .widthFt / .linearFt /
 * .areaSqft / .computedAreaSqft directly; we set whichever fields are
 * relevant for the chosen element type.
 */
function buildTestElement(
  elementType: ElementType,
  testAreaSqft: number,
  testLinearFt: number,
): ProjectElement {
  // Pick reasonable length/width that multiply to areaSqft for area-
  // sensitive computations. Square-ish: side = sqrt(area).
  const side = Math.sqrt(Math.max(testAreaSqft, 1))
  return {
    id: 'engine-debug-test',
    orgId: '',
    projectId: '',
    elementType,
    name: 'Engine debug test element',
    sequence: 0,
    lengthFt: side,
    widthFt: side,
    areaSqft: testAreaSqft,
    linearFt: testLinearFt,
    heightFt: 4, // wall default
    depthIn: 6, // base depth default for substrate calcs
    computedAreaSqft: testAreaSqft,
    materials: [],
    note: null,
  } as unknown as ProjectElement
}

export const EngineMathPanel: React.FC<Props> = ({ isOpen, onClose, materials }) => {
  const [testArea, setTestArea] = useState(100)
  const [testLinear, setTestLinear] = useState(30)
  const [filter, setFilter] = useState('')

  const rows = useMemo(() => {
    const q = filter.toLowerCase().trim()
    const filtered = materials.filter((m) => {
      if (!q) return true
      return (
        m.name.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        (m.computationModel ?? '').toLowerCase().includes(q)
      )
    })

    // Pick a representative element type per material category so the
    // engine has the right dimension fields to read. Doesn't need to
    // be perfect — debug view, not a quote.
    const elementTypeFor = (cat: string): ElementType => {
      if (cat === 'edging' || cat === 'curbing') return 'edging'
      if (cat === 'plant' || cat === 'shrub' || cat === 'tree') return 'shrub_planting'
      if (cat === 'lumber' || cat === 'fence_panel') return 'fence'
      if (cat === 'soil' || cat === 'mulch') return 'garden_bed'
      return 'patio'
    }

    return filtered.map((mat) => {
      const elType = elementTypeFor(mat.category)
      const el = buildTestElement(elType, testArea, testLinear)
      const elMat = {
        id: 'em-debug',
        orgId: '',
        elementId: el.id,
        materialId: mat.id,
        name: mat.name,
        category: mat.category,
        quantity: 0,
        unit: mat.purchaseUnit || mat.unit,
        unitCost: mat.costPerPurchaseUnit ?? mat.cost,
        depthIn: null,
        notes: '',
        createdAt: '',
        computationModel: mat.computationModel,
      }
      const raw = computeElementMaterial(el, elMat, mat)
      const waste = mat.defaultWasteFactor ?? 0.05
      const adjusted = applyWaste(raw, waste)
      const pu = mat.purchaseUnit || mat.unit
      const purchase = roundToPurchaseUnit(adjusted, pu)
      const cost = purchase * (mat.costPerPurchaseUnit ?? mat.cost ?? 0)
      return {
        material: mat,
        raw,
        adjusted,
        purchase,
        purchaseUnit: pu,
        cost,
      }
    })
  }, [materials, testArea, testLinear, filter])

  return (
    <Modal
      isOpen={isOpen}
      title="Engine Math — Debug View"
      onClose={onClose}
      maxWidth="900px"
    >
      <div className="flex flex-col gap-[12px]">
        <div className="text-[12px] text-[var(--text-3)]">
          For test dimensions, see what each material compiles to: raw
          qty → with waste → rounded purchase qty → line cost. The
          engine uses each material's <code className="bg-[var(--surface3)] px-[4px] rounded text-[11px]">computation_model</code> +{' '}
          <code className="bg-[var(--surface3)] px-[4px] rounded text-[11px]">compute_params</code> from
          the materials table. Adjust the test inputs to verify the
          conversions before running real estimates.
        </div>
        <div className="grid grid-cols-3 gap-[8px]">
          <label className="flex flex-col gap-[4px] text-[11px] font-[600] text-[var(--text-3)] uppercase tracking-[0.06em]">
            Test area (sqft)
            <input
              type="number"
              value={testArea}
              onChange={(e) => setTestArea(parseFloat(e.target.value) || 0)}
              className="bg-[var(--surface3)] border border-[var(--border)] rounded-[6px] px-[8px] py-[6px] text-[12px] font-[400] normal-case tracking-normal text-[var(--text)]"
              min={0}
            />
          </label>
          <label className="flex flex-col gap-[4px] text-[11px] font-[600] text-[var(--text-3)] uppercase tracking-[0.06em]">
            Test linear ft
            <input
              type="number"
              value={testLinear}
              onChange={(e) => setTestLinear(parseFloat(e.target.value) || 0)}
              className="bg-[var(--surface3)] border border-[var(--border)] rounded-[6px] px-[8px] py-[6px] text-[12px] font-[400] normal-case tracking-normal text-[var(--text)]"
              min={0}
            />
          </label>
          <label className="flex flex-col gap-[4px] text-[11px] font-[600] text-[var(--text-3)] uppercase tracking-[0.06em]">
            Filter
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="name / category / model"
              className="bg-[var(--surface3)] border border-[var(--border)] rounded-[6px] px-[8px] py-[6px] text-[12px] font-[400] normal-case tracking-normal text-[var(--text)]"
            />
          </label>
        </div>
        <div className="text-[11px] text-[var(--text-4)]">
          Showing {rows.length} of {materials.length} materials.
        </div>
        <div className="max-h-[480px] overflow-y-auto border border-[var(--border)] rounded-[8px]">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-[var(--surface3)] text-[var(--text-3)]">
              <tr className="text-left">
                <th className="px-[8px] py-[6px]">Material</th>
                <th className="px-[8px] py-[6px]">Category</th>
                <th className="px-[8px] py-[6px]">Model</th>
                <th className="px-[8px] py-[6px]">Params</th>
                <th className="px-[8px] py-[6px] text-right tabular-nums">Raw</th>
                <th className="px-[8px] py-[6px] text-right tabular-nums">+Waste</th>
                <th className="px-[8px] py-[6px] text-right tabular-nums">Purchase</th>
                <th className="px-[8px] py-[6px] text-right tabular-nums">Cost</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ material: m, raw, adjusted, purchase, purchaseUnit, cost }) => (
                <tr key={m.id} className="border-t border-[var(--border)]">
                  <td className="px-[8px] py-[5px] text-[var(--text)]">
                    {m.name}
                    {m.subcategory ? (
                      <span className="text-[var(--text-4)]"> · {m.subcategory}</span>
                    ) : null}
                  </td>
                  <td className="px-[8px] py-[5px] text-[var(--text-3)]">{m.category}</td>
                  <td className="px-[8px] py-[5px] text-[var(--text-3)]">
                    <code className="bg-[var(--surface3)] px-[4px] rounded text-[10px]">
                      {m.computationModel ?? 'AREA_COVERAGE'}
                    </code>
                  </td>
                  <td className="px-[8px] py-[5px] text-[var(--text-3)]">
                    {m.computeParams ? (
                      <code className="bg-[var(--surface3)] px-[4px] rounded text-[10px]">
                        {Object.entries(m.computeParams)
                          .map(([k, v]) => `${k}=${v}`)
                          .join(' ')}
                      </code>
                    ) : (
                      <span className="text-[var(--text-4)]">—</span>
                    )}
                  </td>
                  <td className="px-[8px] py-[5px] text-right tabular-nums text-[var(--text-3)]">
                    {raw === 0 ? '—' : raw.toFixed(2)}
                  </td>
                  <td className="px-[8px] py-[5px] text-right tabular-nums text-[var(--text-3)]">
                    {adjusted === 0 ? '—' : adjusted.toFixed(2)}
                  </td>
                  <td className="px-[8px] py-[5px] text-right tabular-nums text-[var(--text)]">
                    {purchase === 0 ? '—' : `${purchase} ${purchaseUnit}`}
                  </td>
                  <td className="px-[8px] py-[5px] text-right tabular-nums text-[var(--green-l)]">
                    {cost === 0 ? '—' : `$${cost.toFixed(2)}`}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-[8px] py-[16px] text-center text-[var(--text-4)]">
                    No materials match the filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  )
}

export default EngineMathPanel
