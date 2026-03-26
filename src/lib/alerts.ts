/**
 * Alert System
 */

import type { Equipment, CrewMember, Material, Project, Alert, AppState } from '@/types';
import { ALERT_THRESHOLDS } from './constants';
import { getMatAllocated } from './inventory';

export function getEquipAlerts(eq: Equipment): Alert[] {
  const alerts: Alert[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const warn = new Date(today);
  warn.setDate(warn.getDate() + ALERT_THRESHOLDS.EQUIPMENT_SERVICE_DAYS);

  const checkDate = (field: keyof Equipment, label: string) => {
    const value = eq[field];
    if (!value || typeof value !== 'string') return;
    const d = new Date(value);
    if (d < today) {
      alerts.push({ level: 'red', title: eq.name, msg: `${label} EXPIRED` });
    } else if (d < warn) {
      alerts.push({ level: 'amber', title: eq.name, msg: `${label} expires ${value}` });
    }
  };

  checkDate('insuranceExpiry', 'Insurance');
  checkDate('regExpiry', 'Registration');
  checkDate('inspectionDue', 'Inspection');
  checkDate('nextService', 'Service');

  if (eq.serviceDueHours && eq.hours && eq.serviceDueHours > 0) {
    const hoursLeft = eq.serviceDueHours - eq.hours;
    if (hoursLeft <= 0) {
      alerts.push({ level: 'red', title: eq.name, msg: `Service OVERDUE by ${Math.abs(hoursLeft)} hrs` });
    } else if (hoursLeft <= ALERT_THRESHOLDS.EQUIPMENT_SERVICE_HOURS) {
      alerts.push({ level: 'amber', title: eq.name, msg: `Service due in ${hoursLeft} hrs` });
    }
  }

  return alerts;
}

export function getCrewCertAlerts(member: CrewMember): Alert[] {
  if (!member.certs || !member.certs.length) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const warn = new Date(today);
  warn.setDate(warn.getDate() + ALERT_THRESHOLDS.CERT_EXPIRY_DAYS);

  const alerts: Alert[] = [];
  member.certs.forEach((c) => {
    if (!c.expiry) return;
    const d = new Date(c.expiry);
    if (d < today) {
      alerts.push({ level: 'red', title: member.name, msg: `${c.label} EXPIRED` });
    } else if (d < warn) {
      alerts.push({ level: 'amber', title: member.name, msg: `${c.label} expires ${c.expiry}` });
    }
  });

  return alerts;
}

export function getInventoryAlerts(materials: Material[], projects: Project[]): Alert[] {
  const alerts: Alert[] = [];

  materials.forEach((mat) => {
    if (mat.qtyOnHand === undefined) return;

    const allocated = getMatAllocated(mat.id, projects);
    const available = mat.qtyOnHand - allocated;

    if (mat.minStockLevel !== undefined && mat.qtyOnHand <= mat.minStockLevel) {
      alerts.push({ level: 'amber', title: mat.name, msg: `Low stock: ${mat.qtyOnHand.toFixed(1)} ${mat.unit}` });
    }

    if (available < 0) {
      alerts.push({ level: 'red', title: mat.name, msg: `Shortfall: ${Math.abs(available).toFixed(1)} ${mat.unit}` });
    }
  });

  return alerts;
}

export function getProjectAlerts(projects: Project[]): Alert[] {
  const alerts: Alert[] = [];

  projects.forEach((p) => {
    if (!p.zones || p.zones.length === 0) {
      alerts.push({ level: 'info', title: p.name, msg: 'No zones defined yet' });
    }
  });

  return alerts;
}

export function getAllAlerts(state: AppState): Alert[] {
  const allAlerts: Alert[] = [];

  (state.equipment || []).forEach((eq) => {
    getEquipAlerts(eq).forEach((a) => {
      allAlerts.push({ ...a, icon: '🔧' });
    });
  });

  (state.crew || []).forEach((c) => {
    getCrewCertAlerts(c).forEach((a) => {
      allAlerts.push({ ...a, icon: '👷' });
    });
  });

  getInventoryAlerts(state.materials, state.projects).forEach((a) => {
    allAlerts.push({ ...a, icon: '📦' });
  });

  getProjectAlerts(state.projects).forEach((a) => {
    allAlerts.push({ ...a, icon: '📋' });
  });

  const severityOrder: Record<string, number> = { red: 0, amber: 1, info: 2 };
  allAlerts.sort((a, b) => (severityOrder[a.level] ?? 9) - (severityOrder[b.level] ?? 9));

  return allAlerts;
}
