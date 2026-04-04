import React, { useState, useCallback } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { SUPPLIER_DIRECTORY, searchSuppliers } from '@/lib/supplierDirectory'
import type { SupplierSuggestion } from '@/lib/supplierDirectory'
import type { Supplier, MaterialCategory } from '@/types'
import { CATEGORY_LABELS } from '@/lib/categories'
import { supabase } from '@/services/supabase'

/** Result from local supplier search (edge function) */
interface LocalSupplierResult {
  name: string
  address: string
  phone: string
  website: string
  categories: string[]
  shopType: string
}

interface AddSuppliersStepProps {
  suppliers: Supplier[]
  onAddSupplier: (supplier: Partial<Supplier>) => Promise<Supplier | null>
  onBack: () => void
  onSkip: () => void
  onContinue: () => void
  isSaving?: boolean
}

/** Category badge pill */
const CatBadge: React.FC<{ cat: string }> = ({ cat }) => (
  <span className="inline-block px-[6px] py-[1px] rounded-[4px] text-[10px] font-[500] bg-[var(--surface-hover)] text-[var(--text-secondary)] mr-1 mb-1">
    {CATEGORY_LABELS[cat as MaterialCategory] || cat}
  </span>
)

export const AddSuppliersStep: React.FC<AddSuppliersStepProps> = ({
  suppliers,
  onAddSupplier,
  onBack,
  onSkip,
  onContinue,
  isSaving = false,
}) => {
  const [search, setSearch] = useState('')
  const [isAdding, setIsAdding] = useState<string | null>(null)
  const [addedNames, setAddedNames] = useState<Set<string>>(new Set(suppliers.map(s => s.name)))
  const [error, setError] = useState<string | null>(null)

  // Location state
  const [location, setLocation] = useState('')
  const [locationEnabled, setLocationEnabled] = useState(false)
  const [detectingLocation, setDetectingLocation] = useState(false)
  const [localResults, setLocalResults] = useState<LocalSupplierResult[]>([])
  const [localSearchDone, setLocalSearchDone] = useState(false)
  const [searchingLocal, setSearchingLocal] = useState(false)

  // Custom supplier form
  const [showCustom, setShowCustom] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customPhone, setCustomPhone] = useState('')
  const [customEmail, setCustomEmail] = useState('')

  const results = search.length > 0 ? searchSuppliers(search) : SUPPLIER_DIRECTORY.slice(0, 10)

  // ── Location detection ──────────────────────────────────────
  const handleDetectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Location is not available in your browser')
      return
    }
    setDetectingLocation(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}&format=json&addressdetails=1`,
            { headers: { 'Accept': 'application/json', 'User-Agent': 'TerrainForge/1.0' } }
          )
          if (resp.ok) {
            const data = await resp.json()
            const addr = data.address || {}
            const city = addr.city || addr.town || addr.village || addr.county || ''
            const state = addr.state || ''
            const loc = [city, state].filter(Boolean).join(', ')
            setLocation(loc)
            setLocationEnabled(true)
            if (loc) searchLocalSuppliers(loc, position.coords.latitude, position.coords.longitude)
          }
        } catch {
          setError('Could not determine your location')
        } finally {
          setDetectingLocation(false)
        }
      },
      () => {
        setDetectingLocation(false)
        setError('Location access was denied. You can type your city below.')
        setLocationEnabled(true)
      },
      { timeout: 10000 }
    )
  }, [])

  const searchLocalSuppliers = async (loc: string, lat?: number, lon?: number) => {
    setSearchingLocal(true)
    setLocalSearchDone(false)
    setError(null)
    try {
      const { data, error: fnError } = await supabase.functions.invoke('search-local-suppliers', {
        body: { location: loc, lat, lon }
      })

      if (fnError) {
        console.error('Supplier search error:', fnError)
        setError(`Search failed: ${fnError.message || 'Unknown error'}`)
        setLocalResults([])
      } else if (data?.error) {
        console.error('Supplier search returned error:', data.error)
        setError(`Search issue: ${data.error}`)
        setLocalResults([])
      } else if (data?.results?.length > 0) {
        setLocalResults(data.results)
      } else {
        setLocalResults([])
      }
    } catch (err) {
      console.error('Supplier search exception:', err)
      setError('Could not search for suppliers. Please try again.')
      setLocalResults([])
    } finally {
      setSearchingLocal(false)
      setLocalSearchDone(true)
    }
  }

  const handleLocationSearch = () => {
    if (location.trim()) searchLocalSuppliers(location.trim())
  }

  const handleLocationKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleLocationSearch()
    }
  }

  // ── Add handlers ────────────────────────────────────────────
  const addSupplierRecord = async (
    name: string,
    data: Partial<Supplier>,
  ) => {
    if (addedNames.has(name) || isAdding) return
    setIsAdding(name)
    setError(null)
    try {
      const result = await onAddSupplier(data)
      if (result) {
        setAddedNames(prev => new Set([...prev, name]))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add supplier')
    } finally {
      setIsAdding(null)
    }
  }

  const handleAddFromDirectory = (suggestion: SupplierSuggestion) => {
    addSupplierRecord(suggestion.name, {
      name: suggestion.name,
      contactName: '',
      phone: '',
      email: '',
      address: '',
      website: suggestion.website,
      categories: suggestion.categories,
      notes: suggestion.description,
      isActive: true,
    })
  }

  const handleAddLocal = (local: LocalSupplierResult, existing: boolean) => {
    addSupplierRecord(local.name, {
      name: local.name,
      contactName: '',
      phone: local.phone || '',
      email: '',
      address: local.address || '',
      website: local.website || '',
      categories: (local.categories || []) as MaterialCategory[],
      notes: existing
        ? `Existing supplier — found near ${location}`
        : `New local supplier — found near ${location}`,
      isActive: true,
    })
  }

  const handleAddCustom = async () => {
    if (!customName.trim() || isAdding) return
    await addSupplierRecord(customName.trim(), {
      name: customName.trim(),
      contactName: '',
      phone: customPhone.trim(),
      email: customEmail.trim(),
      address: '',
      website: '',
      categories: [],
      notes: '',
      isActive: true,
    })
    setCustomName('')
    setCustomPhone('')
    setCustomEmail('')
    setShowCustom(false)
  }

  const formatCategories = (cats: MaterialCategory[] | string[]): string => {
    if (!cats || cats.length === 0) return ''
    if (cats.length <= 3) return cats.map(c => CATEGORY_LABELS[c as MaterialCategory] || c).join(', ')
    return cats.slice(0, 3).map(c => CATEGORY_LABELS[c as MaterialCategory] || c).join(', ') + ` +${cats.length - 3}`
  }

  // ── Render helpers ──────────────────────────────────────────
  const SupplierCard: React.FC<{
    name: string
    subtitle: string
    categories: string[]
    onAction: () => void
    actionLabel: string
  }> = ({ name, subtitle, categories, onAction, actionLabel }) => {
    const alreadyAdded = addedNames.has(name)
    const loading = isAdding === name
    return (
      <div
        className={`p-3 rounded-[8px] border transition-colors ${
          alreadyAdded
            ? 'bg-[var(--surface-selected)] border-[var(--brand-primary)] opacity-70'
            : 'bg-[var(--surface-card)] border-[var(--border-default)] hover:border-[var(--brand-primary)] hover:bg-[var(--surface-hover)]'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <span className="text-[14px] font-[500] text-[var(--text-primary)] block truncate">
              {name}
            </span>
            {subtitle && (
              <p className="text-[12px] text-[var(--text-tertiary)] mt-[2px] truncate">{subtitle}</p>
            )}
            {categories.length > 0 && (
              <div className="mt-[4px] flex flex-wrap">
                {categories.slice(0, 5).map(c => <CatBadge key={c} cat={c} />)}
                {categories.length > 5 && (
                  <span className="text-[10px] text-[var(--text-tertiary)] self-center">+{categories.length - 5}</span>
                )}
              </div>
            )}
          </div>
          <div className="flex-shrink-0 flex flex-col items-end gap-1">
            {alreadyAdded ? (
              <span className="text-[var(--brand-primary)] text-[12px] font-[600]">Added</span>
            ) : loading ? (
              <span className="text-[var(--text-tertiary)] text-[12px]">Adding...</span>
            ) : (
              <button
                onClick={onAction}
                disabled={!!isAdding || isSaving}
                className="text-[12px] font-[500] text-[var(--brand-primary)] hover:text-[var(--brand-primary-hover)] bg-transparent border-none cursor-pointer transition-colors whitespace-nowrap"
              >
                {actionLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[24px] font-[700] text-[var(--text-primary)] mb-2">
          Add material suppliers
        </h2>
        <p className="text-[14px] text-[var(--text-secondary)]">
          Find suppliers near you, pick from well-known brands, or add your own. Categories are auto-tagged so quotes go to the right supplier.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-[8px] bg-[rgba(220,38,38,.15)] border border-[var(--red)] text-[var(--red-l)] text-[13px]">
          {error}
        </div>
      )}

      {/* Added suppliers */}
      {suppliers.length > 0 && (
        <div className="bg-[var(--surface-card)] rounded-[8px] border border-[var(--border-default)] p-4 space-y-2">
          <p className="text-[12px] text-[var(--text-tertiary)] uppercase font-[600]">
            Your suppliers ({suppliers.length})
          </p>
          <div className="space-y-1">
            {suppliers.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-2 rounded-[6px] text-[13px] bg-[var(--surface-selected)] border border-[var(--brand-primary)]"
              >
                <span className="text-[var(--text-primary)] font-[500]">{s.name}</span>
                <span className="text-[var(--text-tertiary)] text-[11px]">
                  {formatCategories(s.categories)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Find Local Suppliers ──────────────────────────────── */}
      <div className="bg-[var(--surface-card)] rounded-[8px] border border-[var(--border-default)] p-4 space-y-3">
        <p className="text-[12px] text-[var(--text-tertiary)] uppercase font-[600]">
          Find local suppliers
        </p>

        {/* Primary CTA: one-click location search */}
        {!localSearchDone && !searchingLocal && !locationEnabled && (
          <Button
            variant="primary"
            onClick={handleDetectLocation}
            className="w-full h-[44px]"
            disabled={detectingLocation || !!isAdding || isSaving}
            loading={detectingLocation}
          >
            <span className="flex items-center justify-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" />
                <line x1="12" y1="2" x2="12" y2="6" />
                <line x1="12" y1="18" x2="12" y2="22" />
                <line x1="2" y1="12" x2="6" y2="12" />
                <line x1="18" y1="12" x2="22" y2="12" />
              </svg>
              Find suppliers near me
            </span>
          </Button>
        )}

        {/* Manual location input — always visible after first interaction */}
        {(locationEnabled || localSearchDone || searchingLocal) && (
          <div className="flex gap-2">
            <div className="flex-1" onKeyDown={handleLocationKeyDown}>
              <Input
                placeholder="City, State (e.g., Twin Cities, MN)"
                value={location}
                onChange={(e) => { setLocation(e.target.value); setLocationEnabled(true) }}
                disabled={searchingLocal || !!isAdding || isSaving}
              />
            </div>
            <Button
              variant="secondary"
              onClick={handleLocationSearch}
              className="h-[38px] px-4 flex-shrink-0"
              disabled={!location.trim() || searchingLocal || !!isAdding || isSaving}
              loading={searchingLocal}
            >
              Search
            </Button>
          </div>
        )}

        {/* Or enter manually link */}
        {!locationEnabled && !localSearchDone && !searchingLocal && (
          <button
            onClick={() => setLocationEnabled(true)}
            className="w-full text-center text-[12px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] bg-transparent border-none cursor-pointer transition-colors"
          >
            or enter your city manually
          </button>
        )}

        {/* Searching state */}
        {searchingLocal && (
          <p className="text-[12px] text-[var(--text-tertiary)] animate-pulse">
            Searching garden centers, nurseries, stone yards, lumber yards, and supply stores near {location}...
          </p>
        )}

        {/* Local results */}
        {localSearchDone && localResults.length > 0 && (
          <div className="space-y-2 mt-1">
            <p className="text-[11px] text-[var(--text-tertiary)]">
              Found {localResults.length} supplier{localResults.length !== 1 ? 's' : ''} within 50 miles
            </p>
            <div className="max-h-[340px] overflow-y-auto space-y-2">
              {localResults.map((local) => (
                <div key={local.name} className={`p-3 rounded-[8px] border transition-colors ${
                  addedNames.has(local.name)
                    ? 'bg-[var(--surface-selected)] border-[var(--brand-primary)] opacity-70'
                    : 'bg-[var(--surface-card)] border-[var(--border-default)]'
                }`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-[14px] font-[500] text-[var(--text-primary)] block">
                        {local.name}
                      </span>
                      <p className="text-[11px] text-[var(--text-tertiary)] mt-[1px]">
                        {local.shopType}{local.address ? ` · ${local.address}` : ''}
                      </p>
                      {local.phone && (
                        <p className="text-[11px] text-[var(--text-tertiary)]">{local.phone}</p>
                      )}
                      {local.categories.length > 0 && (
                        <div className="mt-[4px] flex flex-wrap">
                          {local.categories.slice(0, 6).map(c => <CatBadge key={c} cat={c} />)}
                          {local.categories.length > 6 && (
                            <span className="text-[10px] text-[var(--text-tertiary)] self-center ml-1">+{local.categories.length - 6}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-end gap-[6px] mt-[2px]">
                      {addedNames.has(local.name) ? (
                        <span className="text-[var(--brand-primary)] text-[12px] font-[600]">Added</span>
                      ) : isAdding === local.name ? (
                        <span className="text-[var(--text-tertiary)] text-[12px]">Adding...</span>
                      ) : (
                        <>
                          <button
                            onClick={() => handleAddLocal(local, true)}
                            disabled={!!isAdding || isSaving}
                            className="text-[12px] font-[600] text-[var(--brand-primary)] hover:text-[var(--brand-primary-hover)] bg-transparent border-none cursor-pointer transition-colors whitespace-nowrap"
                          >
                            I use this supplier
                          </button>
                          <button
                            onClick={() => handleAddLocal(local, false)}
                            disabled={!!isAdding || isSaving}
                            className="text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] bg-transparent border-none cursor-pointer transition-colors whitespace-nowrap"
                          >
                            Add as new supplier
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {localSearchDone && localResults.length === 0 && (
          <p className="text-[12px] text-[var(--text-tertiary)] mt-1">
            No suppliers found near {location} in open map data. Try a larger city nearby, or add your suppliers with the custom form below.
          </p>
        )}
      </div>

      {/* ── National Directory ────────────────────────────────── */}
      <div className="space-y-3">
        <Input
          label="Browse national suppliers"
          placeholder="e.g., SiteOne, pavers, irrigation, mulch"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={!!isAdding || isSaving}
        />

        <div className="space-y-2 max-h-[260px] overflow-y-auto">
          {results.map((suggestion) => (
            <SupplierCard
              key={suggestion.name}
              name={suggestion.name}
              subtitle={suggestion.description}
              categories={suggestion.categories}
              onAction={() => handleAddFromDirectory(suggestion)}
              actionLabel="+ Add"
            />
          ))}
        </div>
      </div>

      {/* Custom supplier */}
      {!showCustom ? (
        <button
          onClick={() => setShowCustom(true)}
          className="w-full text-center p-3 rounded-[8px] border border-dashed border-[var(--border-default)] text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--brand-primary)] transition-colors bg-transparent cursor-pointer"
        >
          + Add a supplier not listed above
        </button>
      ) : (
        <div className="bg-[var(--surface-card)] rounded-[8px] border border-[var(--border-default)] p-4 space-y-3">
          <p className="text-[12px] text-[var(--text-tertiary)] uppercase font-[600]">
            Custom supplier
          </p>
          <Input
            label="Supplier Name"
            placeholder="e.g., Mike's Mulch Yard"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            disabled={!!isAdding || isSaving}
          />
          <Input
            label="Phone (optional)"
            placeholder="e.g., 555-123-4567"
            type="tel"
            value={customPhone}
            onChange={(e) => setCustomPhone(e.target.value)}
            disabled={!!isAdding || isSaving}
          />
          <Input
            label="Email (optional)"
            placeholder="e.g., orders@supplier.com"
            type="email"
            value={customEmail}
            onChange={(e) => setCustomEmail(e.target.value)}
            disabled={!!isAdding || isSaving}
          />
          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={handleAddCustom}
              className="flex-1 h-[40px]"
              disabled={!customName.trim() || !!isAdding || isSaving}
              loading={!!isAdding}
            >
              Add Supplier
            </Button>
            <Button
              variant="ghost"
              onClick={() => { setShowCustom(false); setCustomName(''); setCustomPhone(''); setCustomEmail('') }}
              className="h-[40px]"
              disabled={!!isAdding || isSaving}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        <Button
          variant="ghost"
          onClick={onBack}
          className="h-[44px] px-6"
          disabled={!!isAdding || isSaving}
        >
          &larr; Back
        </Button>
        <div className="flex-1" />
        <Button
          variant="ghost"
          onClick={onSkip}
          className="h-[44px]"
          disabled={!!isAdding || isSaving}
        >
          Skip
        </Button>
      </div>

      {suppliers.length > 0 && (
        <Button
          variant="primary"
          onClick={onContinue}
          className="w-full h-[48px]"
          disabled={!!isAdding || isSaving}
        >
          Continue
        </Button>
      )}
    </div>
  )
}
