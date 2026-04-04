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
      iconBg="bg-purple-100 dark:bg-purple-900/40"
      iconColor="text-purple-600 dark:text-purple-400"
    />
    <KPICard
      label="Available"
      value={availableCount}
      icon={<Laptop size={20} />}
      iconBg="bg-green-100 dark:bg-green-900/40"
      iconColor="text-green-600 dark:text-green-400"
    />
    <KPICard
      label="Total Equipment"
      value={equipmentCount}
      icon={<Wrench size={20} />}
      iconBg="bg-orange-100 dark:bg-orange-900/40"
      iconColor="text-orange-600 dark:text-orange-400"
    />
    <KPICard
      label="Maintenance Due"
      value={maintenanceDueCount}
      icon={<AlertTriangle size={20} />}
      iconBg="bg-red-100 dark:bg-red-900/40"
      iconColor="text-red-600 dark:text-red-400"
    />
  </div>
);
