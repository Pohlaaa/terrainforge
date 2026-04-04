import React from 'react';
import { Users, Laptop, Wrench, AlertTriangle } from 'lucide-react';
import { KPICard } from '@/components/shared/KPICard';

interface CrewEquipmentKPIsProps {
  crewCount: number;
  availableCount: number;
  equipmentCount: number;
  maintenanceDueCount: number;
}

export const CrewEquipmentKPIs: React.FC<CrewEquipmentKPIsProps> = ({
  crewCount,
  availableCount,
  equipmentCount,
  maintenanceDueCount,
}) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    <KPICard
      label="Total Crew"
      value={crewCount}
      icon={<Users size={20} />}
      iconVariant="purple"
    />
    <KPICard
      label="Available"
      value={availableCount}
      icon={<Laptop size={20} />}
      iconVariant="green"
    />
    <KPICard
      label="Total Equipment"
      value={equipmentCount}
      icon={<Wrench size={20} />}
      iconVariant="orange"
    />
    <KPICard
      label="Maintenance Due"
      value={maintenanceDueCount}
      icon={<AlertTriangle size={20} />}
      iconVariant="red"
    />
  </div>
);
