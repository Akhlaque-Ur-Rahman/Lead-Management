/** Site-wide SEO defaults for EDUNEX LMS (lms.edunexservices.com). */

export const SEO_SITE = {
  name: 'EDUNEX LMS',
  tagline: 'Multi-tenant Lead Management System',
  description:
    'EDUNEX LMS is a multi-tenant lead management platform for MCA data — track lead pools, assignments, follow-ups, conversions, and team performance.',
  url: 'https://lms.edunexservices.com',
  locale: 'en_IN',
  twitterHandle: '@edunexservices',
  themeColor: '#0f172a',
  /** Static favicon/brand mark served from /public */
  defaultImage: 'https://lms.edunexservices.com/edunex-logo.png',
} as const;

export type PageSeoConfig = {
  /** Browser tab / OG title (without site suffix) */
  title: string;
  description: string;
  /** Path for canonical URL, e.g. /leads */
  path: string;
  /** Private app pages stay out of search indexes */
  robots?: string;
};

/** Canonical SEO copy per route (UI header titles can differ). */
export const PAGE_SEO: Record<string, PageSeoConfig> = {
  login: {
    title: 'Sign in',
    description:
      'Sign in to EDUNEX LMS to manage leads, follow-ups, and team pipelines across your companies.',
    path: '/login',
    robots: 'noindex, nofollow',
  },
  dashboard: {
    title: 'Dashboard',
    description:
      'Overview of your lead pool, assigned leads, follow-ups due today, and conversion performance.',
    path: '/dashboard',
    robots: 'noindex, nofollow',
  },
  /** Super admin landing still lives at /dashboard */
  'super-dashboard': {
    title: 'Super Dashboard',
    description:
      'Platform-wide overview of users, companies, and activity across all EDUNEX LMS tenants.',
    path: '/dashboard',
    robots: 'noindex, nofollow',
  },
  leads: {
    title: 'Lead Pool',
    description:
      'Browse, search, filter, and assign unassigned MCA leads. Import from Excel and manage Hot, Warm, and Cold statuses.',
    path: '/leads',
    robots: 'noindex, nofollow',
  },
  assigned: {
    title: 'Assigned Leads',
    description:
      'View and manage leads assigned to sales users and team members, including follow-up status.',
    path: '/assigned',
    robots: 'noindex, nofollow',
  },
  calendar: {
    title: 'Follow-up Calendar',
    description:
      'Plan and track lead follow-ups by day and month so your team never misses a callback.',
    path: '/calendar',
    robots: 'noindex, nofollow',
  },
  converted: {
    title: 'Converted Leads',
    description:
      'Review successfully converted opportunities with financial details and export reports.',
    path: '/converted',
    robots: 'noindex, nofollow',
  },
  lost: {
    title: 'Lost Leads',
    description:
      'Manage leads marked as lost, restore recoverable opportunities, and audit loss reasons.',
    path: '/lost',
    robots: 'noindex, nofollow',
  },
  reports: {
    title: 'Reports & Analytics',
    description:
      'Analyze lead pipeline performance, team productivity, conversion rates, and trends.',
    path: '/reports',
    robots: 'noindex, nofollow',
  },
  users: {
    title: 'User Management',
    description:
      'Create and manage users, roles, and company access for your EDUNEX LMS workspace.',
    path: '/users',
    robots: 'noindex, nofollow',
  },
  companies: {
    title: 'Company Management',
    description:
      'Manage multi-tenant companies, subscription plans, and platform-wide organization settings.',
    path: '/companies',
    robots: 'noindex, nofollow',
  },
  /** Super admin dashboard uses /dashboard route; keep SEO as Dashboard. */
  settings: {
    title: 'Settings',
    description:
      'Configure branding, website inbound leads, subscription plans, and application preferences.',
    path: '/settings',
    robots: 'noindex, nofollow',
  },
  subscription: {
    title: 'Subscription',
    description: 'View and manage EDUNEX LMS subscription plans and billing preferences.',
    path: '/subscription',
    robots: 'noindex, nofollow',
  },
  help: {
    title: 'Help & Shortcuts',
    description:
      'Quick reference for navigating EDUNEX LMS — keyboard shortcuts, workflows, and tips.',
    path: '/help',
    robots: 'noindex, nofollow',
  },
  'not-found': {
    title: 'Page not found',
    description: 'The page you requested does not exist in EDUNEX LMS.',
    path: '/not-found',
    robots: 'noindex, nofollow',
  },
};

export function resolvePageSeo(tab: string | undefined): PageSeoConfig {
  if (!tab) return PAGE_SEO.dashboard;
  return PAGE_SEO[tab] ?? {
    title: tab.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    description: SEO_SITE.description,
    path: `/${tab}`,
    robots: 'noindex, nofollow',
  };
}

export function formatDocumentTitle(pageTitle: string, siteName = SEO_SITE.name): string {
  const clean = pageTitle.trim();
  if (!clean) return siteName;
  if (clean.toLowerCase() === siteName.toLowerCase()) return siteName;
  if (clean.includes('|')) return clean;
  return `${clean} | ${siteName}`;
}
