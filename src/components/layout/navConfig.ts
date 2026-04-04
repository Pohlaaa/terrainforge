export interface NavTab {
  path: string;
  label: string;
  shortLabel: string;
  icon: string;
}

export interface NavSecondary {
  path: string;
  label: string;
  icon: string;
}

/** Primary hub tabs — always visible in top nav */
export const primaryTabs: NavTab[] = [
  { path: '/dashboard', label: 'Projects', shortLabel: 'Projects', icon: 'folder' },
  { path: '/budget', label: 'Budget & Finance', shortLabel: 'Budget', icon: 'credit-card' },
  { path: '/materials', label: 'Materials', shortLabel: 'Materials', icon: 'package' },
  { path: '/crew-hub', label: 'Crew & Equipment', shortLabel: 'Crew', icon: 'users' },
];

/** Secondary pages — shown in "More" dropdown */
export const secondaryPages: NavSecondary[] = [
  { path: '/work-orders', label: 'Work Orders', icon: 'check-square' },
  { path: '/price-research', label: 'Price Research', icon: 'search' },
  { path: '/settings', label: 'Settings', icon: 'settings' },
  { path: '/billing', label: 'Billing', icon: 'credit-card' },
];

/** Check if a path matches the active tab */
export function isActiveTab(tabPath: string, currentPath: string): boolean {
  if (tabPath === '/dashboard') {
    return currentPath === '/' || currentPath === '/dashboard';
  }
  return currentPath === tabPath || currentPath.startsWith(tabPath + '/');
}

/** Check if current path is a secondary page */
export function isSecondaryPage(currentPath: string): boolean {
  return secondaryPages.some(p => currentPath === p.path || currentPath.startsWith(p.path + '/'));
}
