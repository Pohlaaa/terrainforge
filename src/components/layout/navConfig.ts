export interface NavItem {
  path: string;
  icon: string;
  label: string;
}

export const navConfig: NavItem[] = [
  { path: '/', icon: 'grid', label: 'Dashboard' },
  { path: '/projects', icon: 'folder', label: 'Projects' },
  { path: '/materials', icon: 'package', label: 'Materials' },
  { path: '/crew-manager', icon: 'users', label: 'Crew' },
  { path: '/equipment', icon: 'wrench', label: 'Equipment' },
  { path: '/schedule', icon: 'calendar', label: 'Schedule' },
  { path: '/manifest', icon: 'clipboard', label: 'Manifest' },
  { path: '/work-orders', icon: 'check-square', label: 'Work Orders' },
];

export const secondaryNavItems: NavItem[] = [
  { path: '/settings', icon: 'settings', label: 'Settings' },
  { path: '/billing', icon: 'credit-card', label: 'Billing' },
  { path: '/price-research', icon: 'search', label: 'Price Research' },
];
