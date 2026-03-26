import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/shared/Badge';
import type { Project, Material, PriceResult } from '@/types';

interface PriceResearchProps {
  projects?: Project[];
  materials?: Material[];
  priceResults?: PriceResult[];
  onSelectProject?: (projectId: string) => void;
  onBatchResearch?: (projectId: string, location: string) => void;
  onSingleResearch?: (materialId: string, location: string, query?: string) => void;
}

export const PriceResearch: React.FC<PriceResearchProps> = ({
  projects = [],
  materials = [],
  priceResults = [],
  onSelectProject,
  onBatchResearch,
  onSingleResearch,
}) => {
  // TODO: Connect to useProjectStore(), useMaterialStore()
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [showSinglePanel, setShowSinglePanel] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<string>('');
  const [customQuery, setCustomQuery] = useState<string>('');
  const [isResearching, setIsResearching] = useState(false);

  const activeProject = projects.find((p) => p.id === selectedProject);
  const projectMaterialIds: string[] = [];

  const handleBatchResearch = async () => {
    if (!selectedProject || !location) return;
    setIsResearching(true);
    await onBatchResearch?.(selectedProject, location);
    setIsResearching(false);
  };

  const handleSingleResearch = async () => {
    if (!selectedMaterial || !location) return;
    await onSingleResearch?.(selectedMaterial, location, customQuery || undefined);
  };

  return (
    <div>
      {/* Setup card */}
      <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] p-[20px] mb-[16px]">
        <div className="flex items-start justify-between mb-[18px]">
          <div>
            <h2 className="text-[14px] font-[700] text-[var(--text)]">
              Supplier Price Research
            </h2>
            <p className="text-[12px] text-[var(--text-3)] mt-[4px]">
              Load a project's materials and find the best local prices in one batch
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-[14px] mb-[14px]">
          <Select
            label="Project to Research"
            options={[
              { value: '', label: '— Select a project —' },
              ...projects.map((p) => ({ value: p.id, label: p.name })),
            ]}
            value={selectedProject}
            onChange={(e) => {
              setSelectedProject(e.target.value);
              onSelectProject?.(e.target.value);
            }}
            required
          />
          <Input
            label="Your Location"
            placeholder="e.g. Omaha, NE or 68102"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            hint="City, state or zip — used to find nearby suppliers"
            required
          />
        </div>

        {activeProject && (
          <>
            <div className="h-px bg-[var(--border)] my-[14px]"></div>

            <div className="text-[10px] font-[700] uppercase tracking-[0.1em] text-[var(--text-3)] mb-[10px]">
              Materials in This Project
            </div>

            {projectMaterialIds.length === 0 ? (
              <div className="text-[12px] text-[var(--text-3)] py-[12px]">
                No materials assigned to this project
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-[6px] mb-[14px]">
                  {projectMaterialIds.map((matId: string) => {
                    const mat = materials.find((m) => m.id === matId);
                    return (
                      <span
                        key={matId}
                        className="inline-flex items-center gap-[5px] bg-[var(--surface3)] border border-[var(--border)] rounded-[5px] px-[8px] py-[3px] text-[11px] text-[var(--text-2)]"
                      >
                        {mat?.name || `Material ${matId.slice(0, 8)}`}
                      </span>
                    );
                  })}
                </div>

                <div className="flex gap-[8px] items-center">
                  <Button
                    variant="primary"
                    onClick={handleBatchResearch}
                    disabled={!location}
                  >
                    Research All Prices
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSinglePanel(!showSinglePanel)}
                  >
                    Research One Material
                  </Button>
                  {isResearching && (
                    <span className="text-[12px] text-[var(--text-3)] ml-[8px]">
                      Researching...
                    </span>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Single material research panel */}
      {showSinglePanel && (
        <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] p-[20px] mb-[16px]">
          <div className="flex items-center justify-between mb-[14px]">
            <h3 className="text-[13px] font-[700] text-[var(--text)]">
              Single Material Research
            </h3>
            <button
              onClick={() => setShowSinglePanel(false)}
              className="bg-none border-none text-[var(--text-3)] text-[16px] cursor-pointer hover:text-[var(--text)]"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-[14px] mb-[12px]">
            <Select
              label="Material"
              options={[
                { value: '', label: '— Select from your library —' },
                ...materials.map((m) => ({ value: m.id, label: m.name })),
              ]}
              value={selectedMaterial}
              onChange={(e) => setSelectedMaterial(e.target.value)}
            />
            <Input
              label="Custom Search Query (optional)"
              placeholder="e.g. bulk bluestone pavers wholesale"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
            />
          </div>

          <Button variant="primary" size="sm" onClick={handleSingleResearch}>
            Research
          </Button>
        </div>
      )}

      {/* Results */}
      {priceResults.length > 0 && (
        <div className="space-y-[16px]">
          <h3 className="text-[14px] font-[700] text-[var(--text)] mt-[20px]">
            Research Results
          </h3>

          {priceResults.map((result) => {
            const material = materials.find((m) => m.id === result.materialId);
            return (
              <div
                key={result.id}
                className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] p-[16px]"
              >
                <div className="flex items-center justify-between mb-[12px]">
                  <div>
                    <h4 className="text-[13px] font-[700] text-[var(--text)]">
                      {material?.name || `Material ${result.materialId.slice(0, 8)}`}
                    </h4>
                    <p className="text-[11px] text-[var(--text-3)] mt-[2px]">
                      {result.supplier}
                    </p>
                  </div>
                  {1 && (
                    <Badge variant="green">{Math.round(1 * 100)}%</Badge>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-[12px] mb-[12px]">
                  <div>
                    <div className="text-[10px] text-[var(--text-4)] uppercase font-[700] mb-[4px]">
                      Price
                    </div>
                    <div className="text-[16px] font-serif text-[var(--green-l)]">
                      ${result.price.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[var(--text-4)] uppercase font-[700] mb-[4px]">
                      Quantity
                    </div>
                    <div className="text-[14px] text-[var(--text)]">
                      {1} {result.unit}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[var(--text-4)] uppercase font-[700] mb-[4px]">
                      Updated
                    </div>
                    <div className="text-[12px] text-[var(--text-2)]">
                      {new Date(result.date).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {true && (
                  <a
                    href="#"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] text-[var(--blue-l)] hover:underline"
                  >
                    View Supplier →
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {priceResults.length === 0 && !showSinglePanel && (
        <div className="text-center py-[48px] px-[24px] text-[var(--text-3)]">
          <div className="text-[14px]">No research results yet</div>
          <div className="text-[12px] mt-[8px]">
            Select a project and location to start researching prices
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceResearch;
