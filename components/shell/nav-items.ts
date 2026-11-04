export interface NavItem {
  href: string;
  label: string;
}

/** The main sections, in the order the header shows them. */
export const NAV_ITEMS: NavItem[] = [
  { href: '/learn', label: 'Learn' },
  { href: '/practice', label: 'Practice' },
  { href: '/review', label: 'Review' },
  { href: '/handbook', label: 'Handbook' },
  { href: '/patterns', label: 'Patterns' },
  { href: '/visualizers', label: 'Visualizers' },
  { href: '/progress', label: 'Progress' },
];

/** Pages reachable from the command palette in addition to the main sections. */
export const MORE_ITEMS: NavItem[] = [
  { href: '/', label: 'Home' },
  { href: '/notes', label: 'Notes' },
  { href: '/bookmarks', label: 'Bookmarks' },
  { href: '/settings', label: 'Settings' },
  { href: '/settings/data', label: 'Your data' },
  { href: '/sign-in', label: 'Sign in' },
];
