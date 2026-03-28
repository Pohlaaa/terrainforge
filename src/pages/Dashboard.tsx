import React from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useCrewStore } from '@/stores/crewStore';
import { useEquipmentStore } from '@/stores/equipmentStore';
import { useMaterialStore } from '@/stores/materialStore';
import { getAllAlerts } from '@/lib/alerts';
import { computeProjectCostRaw } from '@/lib/manifest';
import { AlertBanner } from '@/components/shared/AlertBanner';

export const Dashboard: React.FC = () => {
  const { projects, isLoading, error } = useProjectStore();
  const { crew, getAvailableToday } = useCrewStore();
  const { equipment } = useEquipmentStore();
  const { materials } = useMaterialStore();

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

  // Project KPIs
  const activeProjects = projects.filter(p => p.zones && p.zones.length > 0).length;
  const planningProjects = projects.filter(p => !p.zones || p.zones.length === 0).length;
  const totalProjectValue = projects.reduce((sum, p) => sum + computeProjectCostRaw(p, materials), 0);

  // Crew KPIs — real availability from store, assigned from project zones
  const teamSize = crew.length;
  const availableToday = getAvailableToday();
  const availableTodayIds = new Set(availableToday.map(m => m.id));
  const assignedCrewIds = new Set(
    projects.flatMap(p => p.zones.map(z => z.crew)).filter(Boolean)
  );
  // Crew who have a specific booking entry for today
  const todayISO = new Date().toISOString().split('T')[0];
  const bookedTodayIds = new Set(
    crew.filter(m => (m.bookedDates ?? []).includes(todayISO)).map(m => m.id)
  );

  // Fleet KPIs
  const fleetSize = equipment.filter(e => e.status !== 'out-of-service').length;
  const statByStatus = {
    available: equipment.filter(e => e.status === 'available').length,
    inUse: equipment.filter(e => e.status === 'in-use').length,
    maintenance: equipment.filter(e => e.status === 'maintenance').length,
  };

  // Alerts — combined from all 4 stores, sorted by severity
  const alerts = getAllAlerts({ projects, crew, equipment, materials });
  const topAlerts = alerts.slice(0, 5);

  // Crew rows for utilization widget
  const crewRows = crew.map(m => ({
    id: m.id,
    name: m.name,
    availableToday: availableTodayIds.has(m.id),
    assigned: assignedCrewIds.has(m.id),
    bookedToday: bookedTodayIds.has(m.id),
  }));

  // Equipment rows for fleet widget
  const equipmentRows = equipment.slice(0, 5).map(e => ({
    id: e.id,
    name: e.name,
    status: e.status,
  }));

  return (
    <div>
      {error && (
        <div className="mb-[16px]">
          <AlertBanner alert={{ level: 'red', title: 'Load error', msg: error }} />
        </div>
      )}
      <div className="grid grid-cols-[320px_1fr] gap-[16px] items-start">
      {/* LEFT COLUMN: KPIs + Alerts */}
      <div className="flex flex-col gap-[12px]">
        {/* KPI cards */}
        <div className="flex flex-col gap-[8px]">
          <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] p-[16px]">
            <div className="text-[10px] font-[700] text-[var(--text-4)] uppercase tracking-[0.06em] mb-[6px]">
              Active Projects
            </div>
            <div className="font-serif text-[28px] text-[var(--text)] leading-[1]">
              {activeProjects}
            </div>
            {planningProjects > 0 && (
              <div className="text-[10px] text-[var(--text-4)] mt-[4px]">
                +{planningProjects} in planning
              </div>
            )}
          </div>

          <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] p-[16px]">
            <div className="text-[10px] font-[700] text-[var(--text-4)] uppercase tracking-[0.06em] mb-[6px]">
              Total Project Value
            </div>
            <div className="font-serif text-[28px] text-[var(--green-l)] leading-[1]">
              ${(totalProjectValue / 1000).toFixed(1)}k
            </div>
          </div>

          <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] p-[16px]">
            <div className="text-[10px] font-[700] text-[var(--text-4)] uppercase tracking-[0.06em] mb-[6px]">
              Team Size
            </div>
            <div className="font-serif text-[28px] text-[var(--text)] leading-[1]">
              {teamSize}
            </div>
            <div className="text-[10px] text-[var(--text-4)] mt-[4px]">
              {availableToday.length} available today
            </div>
          </div>

          <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] p-[16px]">
            <div className="text-[10px] font-[700] text-[var(--text-4)] uppercase tracking-[0.06em] mb-[6px]">
              Fleet Size
            </div>
            <div className="font-serif text-[28px] text-[var(--text)] leading-[1]">
              {fleetSize}
            </div>
          </div>
        </div>

        {/* Alerts widget */}
        <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] overflow-hidden">
          <div className="px-[16px] py-[12px] border-b border-[var(--border)]">
            <div className="text-[12px] font-[700] text-[var(--text)]">Alerts ({alerts.length})</div>
          </div>
          <div className="max-h-[260px] overflow-y-auto p-[10px_14px]">
            {topAlerts.length === 0 ? (
              <div className="text-[12px] text-[var(--text-3)]">No alerts</div>
            ) : (
              <div className="space-y-[8px]">
                {topAlerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className={`px-[10px] py-[8px] rounded-[6px] text-[11px] ${
                      alert.level === 'red'
                        ? 'bg-[rgba(220,38,38,.1)] border border-[rgba(220,38,38,.3)] text-[#DC2626]'
                        : alert.level === 'amber'
                        ? 'bg-[rgba(251,146,60,.1)] border border-[rgba(251,146,60,.3)] text-[#FB923C]'
                        : 'bg-[rgba(59,130,246,.1)] border border-[rgba(59,130,246,.3)] text-[#3B82F6]'
                    }`}
                  >
                    <div className="font-[600]">{alert.icon} {alert.title}</div>
                    <div className="text-[10px] mt-[2px]">{alert.msg}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Map + Crew + Fleet */}
      <div className="flex flex-col gap-[12px]">
        {/* Map widget */}
        <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] overflow-hidden">
          <div className="px-[16px] py-[12px] border-b border-[var(--border)] flex items-center justify-between">
            <div>
              <div className="text-[12px] font-[700] text-[var(--text)]">
                Active Projects — Map View
              </div>
              <div className="text-[10px] text-[var(--text-4)] mt-[1px]">
                Leaflet integration coming soon
              </div>
            </div>
            <span className="text-[11px] text-[var(--text-3)]">
              {activeProjects} projects
            </span>
          </div>
          <div className="h-[320px] bg-[var(--surface3)] flex items-center justify-center text-[var(--text-3)]">
            Map placeholder
          </div>
        </div>

        {/* Crew + Fleet */}
        <div className="grid grid-cols-2 gap-[12px]">
          {/* Crew utilization */}
          <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] overflow-hidden">
            <div className="px-[16px] py-[12px] border-b border-[var(--border)] flex items-center justify-between">
              <div className="text-[12px] font-[700] text-[var(--text)]">
                Crew Utilization
              </div>
              <span className="text-[10px] text-[var(--text-4)]">
                {availableToday.length}/{teamSize} today
              </span>
            </div>
            <div className="px-[14px] py-[10px] max-h-[180px] overflow-y-auto">
              {crewRows.length === 0 ? (
                <div className="text-[12px] text-[var(--text-3)]">No crew assigned</div>
              ) : (
                <div className="space-y-[8px]">
                  {crewRows.map((member) => (
                    <div key={member.id} className="flex items-center justify-between text-[12px]">
                      <span className="text-[var(--text-2)]">{member.name}</span>
                      {member.assigned ? (
                        <span className="inline-flex bg-[#60A5FA] text-white px-[6px] py-[2px] rounded-[4px] font-[600] text-[10px]">
                          On Job
                        </span>
                      ) : member.bookedToday ? (
                        <span className="inline-flex bg-[#FB923C] text-white px-[6px] py-[2px] rounded-[4px] font-[600] text-[10px]">
                          Booked
                        </span>
                      ) : member.availableToday ? (
                        <span className="inline-flex bg-[var(--green-l)] text-white px-[6px] py-[2px] rounded-[4px] font-[600] text-[10px]">
                          Available
                        </span>
                      ) : (
                        <span className="inline-flex bg-[var(--surface3)] text-[var(--text-4)] px-[6px] py-[2px] rounded-[4px] font-[600] text-[10px]">
                          Off
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Equipment status */}
          <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] overflow-hidden">
            <div className="px-[16px] py-[12px] border-b border-[var(--border)]">
              <div className="text-[12px] font-[700] text-[var(--text)]">
                Fleet Status
              </div>
            </div>
            <div className="px-[14px] py-[12px]">
              <div className="grid grid-cols-3 gap-[8px] text-center text-[11px] mb-[10px]">
                <div>
                  <div className="text-[var(--green-l)] font-[700] text-[18px]">{statByStatus.available}</div>
                  <div className="text-[var(--text-4)] text-[9px] uppercase font-[700]">Available</div>
                </div>
                <div>
                  <div className="text-[#60A5FA] font-[700] text-[18px]">{statByStatus.inUse}</div>
                  <div className="text-[var(--text-4)] text-[9px] uppercase font-[700]">In Use</div>
                </div>
                <div>
                  <div className="text-[#FCD34D] font-[700] text-[18px]">{statByStatus.maintenance}</div>
                  <div className="text-[var(--text-4)] text-[9px] uppercase font-[700]">Service</div>
                </div>
              </div>
            </div>
            <div className="px-[14px] pb-[10px] max-h-[100px] overflow-y-auto">
              {equipmentRows.length === 0 ? (
                <div className="text-[12px] text-[var(--text-3)]">No equipment</div>
              ) : (
                <div className="space-y-[4px]">
                  {equipmentRows.map((equip) => (
                    <div key={equip.id} className="flex items-center justify-between text-[11px]">
                      <span className="text-[var(--text-2)] truncate">{equip.name}</span>
                      <span className={`text-[10px] px-[6px] py-[1px] rounded-[3px] font-[600] ${
                        equip.status === 'available'
                          ? 'bg-[var(--green-l)] text-white'
                          : equip.status === 'in-use'
                          ? 'bg-[#60A5FA] text-white'
                          : 'bg-[#FCD34D] text-[#1a1a1a]'
                      }`}>
                        {equip.status.charAt(0).toUpperCase() + equip.status.slice(1)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Dashboard;
