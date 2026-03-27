import React, { useState, useMemo } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useMaterialStore } from '@/stores/materialStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { AlertBanner } from '@/components/shared/AlertBanner';

export const PriceResearch: React.FC = () => {
  const { projects, isLoading, error } = useProjectStore();
  const { materials } = useMaterialStore();

  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [location, setLocation] = useState('');
  const [materialType, setMaterialType] = useState('');
  const [showSinglePanel, setShowSinglePanel] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [customQuery, setCustomQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const activeProject = useMemo(
    () => projects.find(p => p.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  // Unique material IDs across all zones in the selected project
  const projectMaterialIds = useMemo(() => {
    if (!activeProject) return [];
    const ids = new Set<string>();
    activeProject.zones.forEach(z => z.materials.forEach(m => ids.add(m.materialId)));
    return Array.from(ids);
  }, [activeProject]);

  function handleSearch() {
    setHasSearched(true);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-[64px]">
        <div className="text-center">
          <div className="animate-spin inline-block text-[28px] mb-[10px]">⌛</div>
          <div className="text-[13px] text-[var(--text-3)]">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-[16px]">
          <AlertBanner alert={{ level: 'red', title: 'Load error', msg: error }} />
        </div>
      )}
      {/* ── Coming soon banner ────────────────────────────────────────────── */}
      <div className="border border-[var(--purple-l)] bg-gradient-to-br from-[rgba(124,58,237,.1)] to-[rgba(10,15,10,.9)] rounded-[10px] px-[20px] py-[16px] mb-[16px]">
        <div className="text-[9px] font-[700] uppercase tracking-[0.12em] text-[var(--purple-l)] mb-[6px]">
          AI Feature — Sprint 3
        </div>
        <div className="text-[13px] text-[var(--text-2)] leading-[1.7]">
          Price Research uses the <strong>Claude AI</strong> to search for real supplier
          prices near your location. Select a project to preview its materials — live
          pricing search will be activated in Sprint 3.
        </div>
      </div>

      {/* ── Setup card ───────────────────────────────────────────────────── */}
      <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] p-[20px] mb-[16px]">
        <div className="mb-[18px]">
          <h2 className="text-[14px] font-[700] text-[var(--text)]">Supplier Price Research</h2>
          <p className="text-[12px] text-[var(--text-3)] mt-[4px]">
            Load a project's materials and find the best local prices in one batch
          </p>
        </div>

        <div className="grid grid-cols-2 gap-[14px] mb-[14px]">
          <Select
            label="Project to Research"
            required
            value={selectedProjectId}
            options={[
              { value: '', label: '— Select a project —' },
              ...projects.map(p => ({ value: p.id, label: `${p.name} · ${p.client}` })),
            ]}
            onChange={e => {
              setSelectedProjectId(e.target.value);
              setHasSearched(false);
            }}
          />
          <Input
            label="Your Location"
            placeholder="e.g. Austin, TX or 78701"
            value={location}
            onChange={e => setLocation(e.target.value)}
            hint="City, state or zip — used to find nearby suppliers"
            required
          />
        </div>

        <div className="mb-[14px]">
          <Input
            label="Material Type (optional)"
            placeholder="e.g. concrete pavers, decomposed granite, sod…"
            value={materialType}
            onChange={e => setMaterialType(e.target.value)}
            hint="Narrow the search to a specific material type"
          />
        </div>

        {/* Project materials preview */}
        {activeProject && (
          <>
            <div className="h-px bg-[var(--border)] my-[14px]" />
            <div className="text-[10px] font-[700] uppercase tracking-[0.1em] text-[var(--text-3)] mb-[10px]">
              Materials in this project ({projectMaterialIds.length})
            </div>

            {projectMaterialIds.length === 0 ? (
              <div className="text-[12px] text-[var(--text-3)] py-[8px]">
                No materials assigned to this project's zones yet
              </div>
            ) : (
              <div className="flex flex-wrap gap-[6px] mb-[14px]">
                {projectMaterialIds.map(matId => {
                  const mat = materials.find(m => m.id === matId);
                  return (
                    <span
                      key={matId}
                      className="inline-flex items-center bg-[var(--surface3)] border border-[var(--border)] rounded-[5px] px-[8px] py-[3px] text-[11px] text-[var(--text-2)]"
                    >
                      {mat?.name ?? matId.slice(0, 12)}
                    </span>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Action buttons */}
        <div className="flex gap-[8px] items-center flex-wrap">
          <Button
            variant="primary"
            onClick={handleSearch}
            disabled={!location.trim()}
            title={!location.trim() ? 'Enter a location first' : 'Search for prices (Sprint 3)'}
          >
            🔍 Research All Prices
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setShowSinglePanel(!showSinglePanel); setHasSearched(false); }}
          >
            Research One Material
          </Button>
        </div>
      </div>

      {/* ── Single material panel ─────────────────────────────────────────── */}
      {showSinglePanel && (
        <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] p-[20px] mb-[16px]">
          <div className="flex items-center justify-between mb-[14px]">
            <h3 className="text-[13px] font-[700] text-[var(--text)]">Single Material Research</h3>
            <button
              onClick={() => setShowSinglePanel(false)}
              className="bg-transparent border-none text-[var(--text-3)] text-[16px] cursor-pointer hover:text-[var(--text)]"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-[14px] mb-[12px]">
            <Select
              label="Material"
              value={selectedMaterialId}
              options={[
                { value: '', label: '— Select from your library —' },
                ...materials.map(m => ({ value: m.id, label: m.name })),
              ]}
              onChange={e => setSelectedMaterialId(e.target.value)}
            />
            <Input
              label="Custom Search Query (optional)"
              placeholder="e.g. bulk bluestone pavers wholesale"
              value={customQuery}
              onChange={e => setCustomQuery(e.target.value)}
            />
          </div>

          <Button variant="primary" size="sm" onClick={handleSearch}>
            Research
          </Button>
        </div>
      )}

      {/* ── Coming soon results state ─────────────────────────────────────── */}
      {hasSearched && (
        <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] p-[32px] text-center">
          <div className="text-[32px] mb-[12px] opacity-40">🔍</div>
          <div className="text-[14px] font-[700] text-[var(--text)] mb-[6px]">
            AI Price Search — Coming in Sprint 3
          </div>
          <div className="text-[12px] text-[var(--text-3)] leading-[1.7] max-w-[460px] mx-auto">
            When activated, Claude will search supplier websites for real-time pricing
            near <strong className="text-[var(--text-2)]">{location || 'your location'}</strong>
            {activeProject ? ` for ${projectMaterialIds.length} material${projectMaterialIds.length !== 1 ? 's' : ''} in ${activeProject.name}` : ''}.
            Results will include supplier name, price, unit, and a direct link.
          </div>
          <div className="mt-[16px] flex gap-[8px] justify-center flex-wrap">
            <span className="inline-flex items-center gap-[6px] bg-[var(--surface3)] border border-[var(--border)] rounded-[6px] px-[10px] py-[5px] text-[11px] text-[var(--text-3)]">
              ✓ Project selector — ready
            </span>
            <span className="inline-flex items-center gap-[6px] bg-[var(--surface3)] border border-[var(--border)] rounded-[6px] px-[10px] py-[5px] text-[11px] text-[var(--text-3)]">
              ✓ Location input — ready
            </span>
            <span className="inline-flex items-center gap-[6px] bg-[var(--surface3)] border border-[var(--border)] rounded-[6px] px-[10px] py-[5px] text-[11px] text-[var(--text-3)]">
              ✓ Material list — ready
            </span>
            <span className="inline-flex items-center gap-[6px] bg-[rgba(124,58,237,.15)] border border-[var(--purple-l)] rounded-[6px] px-[10px] py-[5px] text-[11px] text-[var(--purple-l)]">
              ⏳ Claude API call — Sprint 3
            </span>
          </div>
        </div>
      )}

      {/* ── Default empty state ───────────────────────────────────────────── */}
      {!hasSearched && !showSinglePanel && (
        <div className="text-center py-[48px] px-[24px] text-[var(--text-3)]">
          <div className="text-[40px] mb-[12px] opacity-30">📊</div>
          <div className="text-[14px] font-[600] text-[var(--text-2)] mb-[6px]">No results yet</div>
          <div className="text-[12px]">
            Select a project and enter your location, then click Research All Prices
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceResearch;
