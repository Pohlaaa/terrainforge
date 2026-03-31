import React from 'react';
import type { Project, ProjectPermit } from '@/types';

interface Props {
  project: Project;
  permits: ProjectPermit[];
}

const cardClass = 'rounded-[10px] border p-[16px]';
const cardHead = 'text-[12px] font-[700] uppercase text-[var(--text-3)] mb-[14px]';
const rowClass = 'flex justify-between text-[12px] py-[4px]';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  needed: { label: 'Needed', color: 'var(--status-amber)', bg: 'rgba(212,164,76,0.1)' },
  applied: { label: 'Applied', color: 'var(--status-blue)', bg: 'rgba(59,130,246,0.1)' },
  approved: { label: 'Approved', color: 'var(--status-green)', bg: 'rgba(22,163,74,0.1)' },
  denied: { label: 'Denied', color: 'var(--status-red)', bg: 'rgba(224,92,92,0.1)' },
  not_required: { label: 'Not Required', color: 'var(--text-4)', bg: 'var(--surface3)' },
  expired: { label: 'Expired', color: 'var(--status-red)', bg: 'rgba(224,92,92,0.1)' },
};

const INSPECTION_COLORS: Record<string, string> = {
  passed: 'var(--status-green)',
  failed: 'var(--status-red)',
  conditional: 'var(--status-amber)',
  pending: 'var(--text-4)',
};

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export const ProjectDashboardCompliance: React.FC<Props> = ({ project, permits }) => {
  const totalFees = permits.reduce((sum, p) => sum + (p.fee ?? 0), 0);
  const approvedCount = permits.filter((p) => p.status === 'approved').length;

  return (
    <div className="space-y-[16px]">
      {/* Overall Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-[10px]">
        <div
          className="rounded-[8px] border p-[12px]"
          style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}
        >
          <div className="text-[10px] font-[600] uppercase text-[var(--text-4)] mb-[4px]">Permit Status</div>
          <div className="text-[16px] font-[700] text-[var(--text)] capitalize">
            {project.permitStatus?.replace('_', ' ') || 'Not set'}
          </div>
        </div>
        <div
          className="rounded-[8px] border p-[12px]"
          style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}
        >
          <div className="text-[10px] font-[600] uppercase text-[var(--text-4)] mb-[4px]">Permits</div>
          <div className="text-[16px] font-[700] text-[var(--text)]">
            {approvedCount}/{permits.length}
          </div>
          <div className="text-[11px] text-[var(--text-4)]">approved</div>
        </div>
        <div
          className="rounded-[8px] border p-[12px]"
          style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}
        >
          <div className="text-[10px] font-[600] uppercase text-[var(--text-4)] mb-[4px]">Total Fees</div>
          <div className="text-[16px] font-[700] text-[var(--text)]">
            {totalFees > 0 ? `$${totalFees.toLocaleString()}` : '—'}
          </div>
        </div>
        {project.permitZone && (
          <div
            className="rounded-[8px] border p-[12px]"
            style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}
          >
            <div className="text-[10px] font-[600] uppercase text-[var(--text-4)] mb-[4px]">Jurisdiction</div>
            <div className="text-[14px] font-[600] text-[var(--text)]">{project.permitZone}</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-[16px] items-start">
        {/* ── Permit List ─────────────────────────────────────────────────────── */}
        <div className={cardClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
          <div className={cardHead}>Permits</div>

          {permits.length === 0 ? (
            <div className="text-center py-[20px]">
              <p className="text-[13px] text-[var(--text-4)]">
                {project.permitStatus === 'not_required'
                  ? 'No permits required for this project.'
                  : 'No permits tracked yet. Permits are set during project creation.'}
              </p>
            </div>
          ) : (
            <div className="space-y-[10px]">
              {permits.map((permit) => {
                const statusConf = STATUS_CONFIG[permit.status] || STATUS_CONFIG.needed;
                return (
                  <div
                    key={permit.id}
                    className="rounded-[8px] border px-[14px] py-[12px]"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <div className="flex items-center justify-between mb-[6px]">
                      <span className="text-[13px] font-[600] text-[var(--text)] capitalize">
                        {permit.permitType.replace(/_/g, ' ')}
                      </span>
                      <span
                        className="px-[8px] py-[2px] rounded-[4px] text-[11px] font-[500]"
                        style={{ backgroundColor: statusConf.bg, color: statusConf.color }}
                      >
                        {statusConf.label}
                      </span>
                    </div>

                    <div className="space-y-[2px]">
                      {permit.jurisdiction && (
                        <div className={rowClass}>
                          <span className="text-[var(--text-4)]">Jurisdiction</span>
                          <span className="text-[var(--text-2)]">{permit.jurisdiction}</span>
                        </div>
                      )}
                      {permit.permitNumber && (
                        <div className={rowClass}>
                          <span className="text-[var(--text-4)]">Permit #</span>
                          <span className="text-[var(--text-2)]">{permit.permitNumber}</span>
                        </div>
                      )}
                      {permit.fee != null && permit.fee > 0 && (
                        <div className={rowClass}>
                          <span className="text-[var(--text-4)]">Fee</span>
                          <span className="text-[var(--text-2)]">${permit.fee.toLocaleString()}</span>
                        </div>
                      )}
                      {permit.appliedDate && (
                        <div className={rowClass}>
                          <span className="text-[var(--text-4)]">Applied</span>
                          <span className="text-[var(--text-2)]">{formatDate(permit.appliedDate)}</span>
                        </div>
                      )}
                      {permit.approvedDate && (
                        <div className={rowClass}>
                          <span className="text-[var(--text-4)]">Approved</span>
                          <span className="text-[var(--text-2)]">{formatDate(permit.approvedDate)}</span>
                        </div>
                      )}
                      {permit.inspectionDate && (
                        <div className={rowClass}>
                          <span className="text-[var(--text-4)]">Inspection</span>
                          <span className="text-[var(--text-2)]">
                            {formatDate(permit.inspectionDate)}
                            {permit.inspectionResult && (
                              <span
                                className="ml-[6px] font-[500]"
                                style={{ color: INSPECTION_COLORS[permit.inspectionResult] || 'var(--text-4)' }}
                              >
                                ({permit.inspectionResult})
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    {permit.notes && (
                      <p className="text-[11px] text-[var(--text-4)] italic mt-[6px]">{permit.notes}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Risk Notes ──────────────────────────────────────────────────────── */}
        <div className="space-y-[12px]">
          {project.complianceNotes && (
            <div className={cardClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
              <div className={cardHead}>Risk & Compliance Notes</div>
              <p className="text-[12px] text-[var(--text-2)] leading-[1.5] whitespace-pre-wrap">
                {project.complianceNotes}
              </p>
            </div>
          )}

          {/* HOA */}
          {project.hoaFlag && (
            <div
              className={cardClass}
              style={{ backgroundColor: 'rgba(212,164,76,0.06)', borderColor: 'var(--status-amber)' }}
            >
              <div className="text-[12px] font-[600] text-[var(--status-amber)] mb-[6px]">HOA Property</div>
              {project.hoaRules ? (
                <p className="text-[12px] text-[var(--text-2)]">{project.hoaRules}</p>
              ) : (
                <p className="text-[12px] text-[var(--text-4)]">No HOA rules documented.</p>
              )}
            </div>
          )}

          {/* Access */}
          {(project.gateCode || project.parkingRestrictions || project.permittedHours) && (
            <div className={cardClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
              <div className={cardHead}>Access & Logistics</div>
              <div className="space-y-[4px]">
                {project.gateCode && (
                  <div className={rowClass}>
                    <span className="text-[var(--text-4)]">Gate Code</span>
                    <span className="text-[var(--text-2)]">{project.gateCode}</span>
                  </div>
                )}
                {project.permittedHours && (
                  <div className={rowClass}>
                    <span className="text-[var(--text-4)]">Work Hours</span>
                    <span className="text-[var(--text-2)]">{project.permittedHours}</span>
                  </div>
                )}
                {project.parkingRestrictions && (
                  <div className={rowClass}>
                    <span className="text-[var(--text-4)]">Parking</span>
                    <span className="text-[var(--text-2)]">{project.parkingRestrictions}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
