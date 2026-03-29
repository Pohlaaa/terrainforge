import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useMaterialStore } from '@/stores/materialStore';
import { callClaude } from '@/services/anthropic';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { AlertBanner } from '@/components/shared/AlertBanner';
import { Skeleton } from '@/components/shared/Skeleton';
import type { PriceEstimate, PriceCacheEntry, Material } from '@/types';

// ── Cache helpers (module-level pure functions) ───────────────────────────────

const CACHE_PREFIX = 'tf_price_';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function buildCacheKey(material: string, location: string): string {
  return `${CACHE_PREFIX}${material.toLowerCase().trim()}:${location.toLowerCase().trim()}`;
}

function readCacheEntry(material: string, location: string): PriceCacheEntry | null {
  try {
    const raw = localStorage.getItem(buildCacheKey(material, location));
    if (!raw) return null;
    const entry = JSON.parse(raw) as PriceCacheEntry;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(buildCacheKey(material, location));
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

function writeCache(material: string, location: string, results: PriceEstimate[]): void {
  try {
    const entry: PriceCacheEntry = { timestamp: Date.now(), results };
    localStorage.setItem(buildCacheKey(material, location), JSON.stringify(entry));
  } catch {
    // localStorage full — silently skip caching this result
  }
}

function formatCacheAge(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 2) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  return diffHours === 1 ? '1 hour ago' : `${diffHours}h ago`;
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPricePrompt(material: string, location: string): string {
  return (
    `You are a materials cost estimator for landscaping projects in ${location}.\n` +
    `Research current retail and wholesale prices for ${material}. Return a JSON array of:\n` +
    `[{ "supplierType": string, "unit": string, "priceLow": number, "priceHigh": number, "notes": string }]\n` +
    `Return ONLY the JSON array with no additional text.`
  );
}

// ── Response parser ───────────────────────────────────────────────────────────

function parsePriceEstimates(text: string): PriceEstimate[] {
  // Extract the first [...] block even if Claude includes surrounding text
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) {
    throw new Error('Could not find a JSON array in the AI response. Try searching again.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    throw new Error('AI returned malformed JSON. Try searching again.');
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Unexpected response format from AI. Try searching again.');
  }

  return parsed.map((item) => {
    const obj = item as Record<string, unknown>;
    return {
      supplierType: String(obj.supplierType ?? obj.supplier_type ?? 'General'),
      unit:         String(obj.unit ?? 'each'),
      priceLow:     Number(obj.priceLow  ?? obj.price_low  ?? 0),
      priceHigh:    Number(obj.priceHigh ?? obj.price_high ?? 0),
      notes:        String(obj.notes ?? ''),
    };
  });
}

// ── Material query builder ────────────────────────────────────────────────────

/**
 * Determine what material string to send to Claude.
 * Priority: explicit materialType field → project material names → generic fallback.
 */
function buildMaterialQuery(
  materialType: string,
  projectMaterialIds: string[],
  materials: Material[]
): string {
  if (materialType.trim()) return materialType.trim();

  if (projectMaterialIds.length > 0) {
    const names = projectMaterialIds
      .slice(0, 5)
      .map((id) => materials.find((m) => m.id === id)?.name)
      .filter((n): n is string => Boolean(n));
    if (names.length > 0) return names.join(', ');
  }

  return 'landscaping materials';
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ResultMeta {
  material: string;
  location: string;
  fromCache: boolean;
  cachedAt: number | null;
}

export const PriceResearch: React.FC = () => {
  const { projects, isLoading, error } = useProjectStore();
  const { materials } = useMaterialStore();

  const [initialLoad, setInitialLoad] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setInitialLoad(false), 600);
    return () => clearTimeout(t);
  }, []);

  // Form state
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [location, setLocation] = useState('');
  const [materialType, setMaterialType] = useState('');
  const [showSinglePanel, setShowSinglePanel] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [customQuery, setCustomQuery] = useState('');

  // Search state
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<PriceEstimate[] | null>(null);
  const [resultMeta, setResultMeta] = useState<ResultMeta | null>(null);
  const [lastSearchMaterial, setLastSearchMaterial] = useState('');

  // Derived values
  const activeProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  const projectMaterialIds = useMemo(() => {
    if (!activeProject) return [];
    const ids = new Set<string>();
    activeProject.zones.forEach((z) => z.materials.forEach((m) => ids.add(m.materialId)));
    return Array.from(ids);
  }, [activeProject]);

  // ── Core search handler ──────────────────────────────────────────────────

  const handleSearch = useCallback(
    async (material: string) => {
      if (!material.trim()) return;
      if (!location.trim()) return;

      setSearchError(null);
      setLastSearchMaterial(material);

      // Check cache first — skip API call if result is fresh
      const cached = readCacheEntry(material, location);
      if (cached) {
        setResults(cached.results);
        setResultMeta({
          material,
          location,
          fromCache: true,
          cachedAt: cached.timestamp,
        });
        return;
      }

      setIsSearching(true);
      setResults(null);
      setResultMeta(null);

      try {
        const prompt = buildPricePrompt(material, location);
        const text = await callClaude(prompt);
        const estimates = parsePriceEstimates(text);

        writeCache(material, location, estimates);
        setResults(estimates);
        setResultMeta({ material, location, fromCache: false, cachedAt: null });
      } catch (err) {
        setSearchError(err instanceof Error ? err.message : 'Price research failed');
      } finally {
        setIsSearching(false);
      }
    },
    [location]
  );

  // ── Button click handlers ─────────────────────────────────────────────────

  function handleBatchSearch() {
    const material = buildMaterialQuery(materialType, projectMaterialIds, materials);
    handleSearch(material);
  }

  function handleSingleSearch() {
    const selectedMat = materials.find((m) => m.id === selectedMaterialId);
    const material = customQuery.trim() || selectedMat?.name || '';
    if (!material) return;
    handleSearch(material);
  }

  function handleRetry() {
    if (lastSearchMaterial) handleSearch(lastSearchMaterial);
  }

  // ── Loading state ─────────────────────────────────────────────────────────

  if (isLoading || initialLoad) {
    return (
      <div className="flex flex-col gap-[12px]">
        <Skeleton width="200px" height="22px" className="mb-[4px]" />
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: '10px', padding: '20px' }}>
          <div className="flex gap-[12px] mb-[16px]">
            <Skeleton height="44px" />
            <Skeleton width="120px" height="44px" />
          </div>
          {[0,1,2].map(i => (
            <div key={i} style={{ borderBottom: '1px solid var(--border-light)', padding: '12px 0' }}>
              <Skeleton width="60%" height="13px" className="mb-[8px]" />
              <Skeleton width="40%" height="10px" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {error && (
        <div className="mb-[16px]">
          <AlertBanner alert={{ level: 'red', title: 'Load error', msg: error }} />
        </div>
      )}

      {/* ── Setup card ─────────────────────────────────────────────────────── */}
      <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] p-[20px] mb-[16px]">
        <div className="flex items-start justify-between mb-[18px]">
          <div>
            <h2 className="text-[14px] font-[700] text-[var(--text)]">Supplier Price Research</h2>
            <p className="text-[12px] text-[var(--text-3)] mt-[4px]">
              Find current retail and wholesale prices near you — powered by Claude
            </p>
          </div>
          <span className="flex-shrink-0 inline-flex items-center gap-[5px] bg-[rgba(124,58,237,.12)] border border-[rgba(124,58,237,.3)] rounded-[5px] px-[8px] py-[3px] text-[10px] font-[600] text-[#A78BFA] ml-[12px]">
            ✦ AI
          </span>
        </div>

        <div className="grid grid-cols-2 gap-[14px] mb-[14px]">
          <Select
            label="Project to Research"
            value={selectedProjectId}
            options={[
              { value: '', label: '— Select a project (optional) —' },
              ...projects.map((p) => ({ value: p.id, label: `${p.name} · ${p.client}` })),
            ]}
            onChange={(e) => {
              setSelectedProjectId(e.target.value);
              setResults(null);
              setResultMeta(null);
            }}
          />
          <Input
            label="Your Location"
            placeholder="e.g. Austin, TX or 78701"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            hint="City, state or zip — used to find nearby supplier prices"
            required
          />
        </div>

        <div className="mb-[14px]">
          <Input
            label="Material Type"
            placeholder="e.g. concrete pavers, decomposed granite, sod…"
            value={materialType}
            onChange={(e) => setMaterialType(e.target.value)}
            hint={
              activeProject && projectMaterialIds.length > 0
                ? 'Leave blank to search all project materials, or narrow to a specific type'
                : 'What material do you want to price out?'
            }
          />
        </div>

        {/* Project materials preview — clickable chips pre-fill materialType */}
        {activeProject && (
          <>
            <div className="h-px bg-[var(--border)] my-[14px]" />
            <div className="text-[10px] font-[700] uppercase tracking-[0.1em] text-[var(--text-3)] mb-[10px]">
              Materials in this project ({projectMaterialIds.length}) — click to search
            </div>

            {projectMaterialIds.length === 0 ? (
              <div className="text-[12px] text-[var(--text-3)] py-[8px]">
                No materials assigned to this project's zones yet
              </div>
            ) : (
              <div className="flex flex-wrap gap-[6px] mb-[14px]">
                {projectMaterialIds.map((matId) => {
                  const mat = materials.find((m) => m.id === matId);
                  const name = mat?.name ?? matId.slice(0, 12);
                  const isActive = materialType === name;
                  return (
                    <button
                      key={matId}
                      onClick={() => setMaterialType(isActive ? '' : name)}
                      className={`inline-flex items-center rounded-[5px] px-[8px] py-[3px] text-[11px] border transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-[rgba(116,198,157,.15)] border-[var(--green-l)] text-[var(--green-l)]'
                          : 'bg-[var(--surface3)] border-[var(--border)] text-[var(--text-2)] hover:border-[var(--green-l)] hover:text-[var(--green-l)]'
                      }`}
                    >
                      {name}
                    </button>
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
            onClick={handleBatchSearch}
            disabled={!location.trim() || isSearching}
            title={!location.trim() ? 'Enter a location first' : undefined}
          >
            {isSearching ? '⌛ Searching…' : '🔍 Research All Prices'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowSinglePanel(!showSinglePanel);
              setResults(null);
              setResultMeta(null);
              setSearchError(null);
            }}
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
              label="Material from Library"
              value={selectedMaterialId}
              options={[
                { value: '', label: '— Select from your library —' },
                ...materials.map((m) => ({ value: m.id, label: m.name })),
              ]}
              onChange={(e) => setSelectedMaterialId(e.target.value)}
            />
            <Input
              label="Custom Query (overrides selection)"
              placeholder="e.g. bulk bluestone pavers wholesale"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
            />
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSingleSearch}
            disabled={(!selectedMaterialId && !customQuery.trim()) || !location.trim() || isSearching}
            title={
              !location.trim()
                ? 'Enter a location above first'
                : !selectedMaterialId && !customQuery.trim()
                ? 'Select a material or enter a query'
                : undefined
            }
          >
            {isSearching ? '⌛ Searching…' : 'Research'}
          </Button>
        </div>
      )}

      {/* ── Searching spinner ─────────────────────────────────────────────── */}
      {isSearching && (
        <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] p-[40px] text-center mb-[16px]">
          <div className="text-[32px] mb-[12px] animate-pulse">✦</div>
          <div className="text-[14px] font-[600] text-[var(--text)] mb-[6px]">
            Claude is researching prices…
          </div>
          <div className="text-[12px] text-[var(--text-3)]">
            Searching for{' '}
            <span className="text-[var(--text-2)]">{lastSearchMaterial}</span> near{' '}
            <span className="text-[var(--text-2)]">{location}</span>
          </div>
        </div>
      )}

      {/* ── Error state ───────────────────────────────────────────────────── */}
      {searchError && !isSearching && (
        <div className="bg-[var(--surface2)] border border-[rgba(220,38,38,.3)] rounded-[10px] p-[20px] mb-[16px]">
          <div className="flex items-start gap-[12px]">
            <span className="text-[20px] flex-shrink-0">⚠️</span>
            <div className="flex-1">
              <div className="text-[13px] font-[600] text-[#F87171] mb-[4px]">Search Failed</div>
              <div className="text-[12px] text-[var(--text-3)] mb-[14px]">{searchError}</div>
              <Button variant="outline" size="sm" onClick={handleRetry}>
                ↺ Try Again
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Results ───────────────────────────────────────────────────────── */}
      {results && resultMeta && !isSearching && (
        <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] overflow-hidden mb-[16px]">
          {/* Results header */}
          <div className="px-[20px] py-[14px] border-b border-[var(--border)] flex items-center justify-between flex-wrap gap-[8px]">
            <div>
              <div className="text-[13px] font-[700] text-[var(--text)]">
                Prices for{' '}
                <span className="text-[var(--green-l)]">{resultMeta.material}</span>
                {' '}near{' '}
                <span className="text-[var(--green-l)]">{resultMeta.location}</span>
              </div>
              <div className="text-[10px] text-[var(--text-4)] mt-[2px]">
                {results.length} result{results.length !== 1 ? 's' : ''}
              </div>
            </div>
            <div className="flex items-center gap-[8px]">
              {resultMeta.fromCache && resultMeta.cachedAt !== null && (
                <span className="inline-flex items-center gap-[4px] bg-[var(--surface3)] border border-[var(--border)] rounded-[4px] px-[8px] py-[3px] text-[10px] text-[var(--text-4)]">
                  💾 Cached · {formatCacheAge(resultMeta.cachedAt)}
                </span>
              )}
              <button
                onClick={handleRetry}
                className="text-[11px] text-[var(--text-3)] hover:text-[var(--green-l)] transition-colors"
                title="Run a fresh search"
              >
                ↺ Refresh
              </button>
            </div>
          </div>

          {results.length === 0 ? (
            <div className="px-[20px] py-[32px] text-center text-[13px] text-[var(--text-3)]">
              No price estimates returned. Try a different material or location.
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left px-[20px] py-[10px] text-[10px] font-[700] uppercase tracking-[0.08em] text-[var(--text-4)] w-[22%]">
                        Supplier Type
                      </th>
                      <th className="text-left px-[12px] py-[10px] text-[10px] font-[700] uppercase tracking-[0.08em] text-[var(--text-4)] w-[12%]">
                        Unit
                      </th>
                      <th className="text-right px-[12px] py-[10px] text-[10px] font-[700] uppercase tracking-[0.08em] text-[var(--text-4)] w-[18%]">
                        Price Range
                      </th>
                      <th className="text-left px-[12px] py-[10px] text-[10px] font-[700] uppercase tracking-[0.08em] text-[var(--text-4)]">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((row, idx) => (
                      <tr
                        key={idx}
                        className={`border-b border-[var(--border)] last:border-b-0 ${
                          idx % 2 === 0 ? '' : 'bg-[rgba(255,255,255,.02)]'
                        }`}
                      >
                        <td className="px-[20px] py-[12px] font-[500] text-[var(--text)]">
                          {row.supplierType}
                        </td>
                        <td className="px-[12px] py-[12px] text-[var(--text-2)]">
                          {row.unit}
                        </td>
                        <td className="px-[12px] py-[12px] text-right font-[600] font-mono">
                          {row.priceLow === row.priceHigh ? (
                            <span className="text-[var(--green-l)]">
                              ${row.priceLow.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-[var(--green-l)]">
                              ${row.priceLow.toFixed(2)}
                              <span className="text-[var(--text-4)] font-normal"> – </span>
                              ${row.priceHigh.toFixed(2)}
                            </span>
                          )}
                        </td>
                        <td className="px-[12px] py-[12px] text-[var(--text-3)] leading-[1.55]">
                          {row.notes || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Disclaimer */}
              <div className="px-[20px] py-[12px] bg-[rgba(251,146,60,.05)] border-t border-[rgba(251,146,60,.2)] flex items-start gap-[8px]">
                <span className="flex-shrink-0 text-[12px] text-[#FB923C] mt-[1px]">⬥</span>
                <div className="text-[11px] text-[var(--text-3)] leading-[1.6]">
                  <span className="font-[600] text-[#FB923C]">Results may vary</span> — verify prices
                  with local suppliers before committing to a budget. Prices are AI estimates based on
                  typical regional market rates and may not reflect current stock or seasonal changes.
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Default empty state ───────────────────────────────────────────── */}
      {!results && !isSearching && !searchError && (
        <div className="text-center py-[48px] px-[24px] text-[var(--text-3)]">
          <div className="text-[40px] mb-[12px] opacity-30">📊</div>
          <div className="text-[14px] font-[600] text-[var(--text-2)] mb-[6px]">No results yet</div>
          <div className="text-[12px]">
            {location.trim()
              ? 'Click Research All Prices to get AI-powered supplier estimates'
              : 'Enter your location and click Research All Prices to get started'}
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceResearch;
