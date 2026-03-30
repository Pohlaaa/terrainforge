export interface NavItem {
  path: string;
  icon: string;
  label: string;
}

export interface NavGroup {
  key: string;
  icon: string;
  label: string;
  defaultPath: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    key: 'dashboard',
    icon: 'grid',
    label: 'Dashboard',
    defaultPath: '/',
    items: [],
  },
  {
    key: 'jobs',
    icon: 'folder',
    label: 'Jobs',
    defaultPath: '/projects',
    items: [
      { path: '/projects', icon: 'folder', label: 'Projects' },
      { path: '/schedule', icon: 'calendar', label: 'Schedule' },
      { path: '/work-orders', icon: 'check-square', label: 'Work Orders' },
    ],
  },
  {
    key: 'resources',
    icon: 'users',
    label: 'Resources',
    defaultPath: '/crew-manager',
    items: [
      { path: '/crew-manager', icon: 'users', label: 'Crew' },
      { path: '/equipment', icon: 'wrench', label: 'Equipment' },
      { path: '/materials', icon: 'package', label: 'Materials' },
    ],
  },
  {
    key: 'manifest',
    icon: 'clipboard',
    label: 'Manifest',
    defaultPath: '/manifest',
    items: [
      { path: '/manifest', icon: 'clipboard', label: 'Manifest Engine' },
      { path: '/price-research', icon: 'search', label: 'Price Research' },
    ],
  },
  {
    key: 'settings',
    icon: 'settings',
    label: 'Settings',
    defaultPath: '/settings',
    items: [
      { path: '/settings', icon: 'settings', label: 'Settings' },
      { path: '/billing', icon: 'credit-card', label: 'Billing' },
    ],
  },
];

/** Find which group a pathname belongs to */
export function findGroupForPath(pathname: string): NavGroup | undefined {
  return navGroups.find((g) => {
    if (g.defaultPath === '/' && pathname === '/') return true;
    if (g.items.some((item) => pathname === item.path || pathname.startsWith(item.path + '/'))) return true;
    if (g.defaultPath !== '/' && pathname.startsWith(g.defaultPath)) return true;
    return false;
  });
}

/** Flat list of all navigable pages (for mobile sidebar) */
export const allNavItems: NavItem[] = navGroups.flatMap((g) =>
  g.items.length > 0 ? g.items : [{ path: g.defaultPath, icon: g.icon, label: g.label }]
);
