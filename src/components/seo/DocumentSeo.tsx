import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { resolvePageSeo, SEO_SITE } from '../../config/seo';
import { useDocumentSeo } from '../../hooks/useDocumentSeo';

/**
 * Keeps document <title> and meta tags in sync with the active route.
 * Mount once under BrowserRouter (inside AuthProvider for branding).
 */
export function DocumentSeo() {
  const location = useLocation();
  const { user, systemName, systemLogoUrl } = useAuth();

  const tab = useMemo(() => {
    const segment = location.pathname.replace(/^\//, '').split('/')[0] || 'dashboard';
    if (segment === 'login') return 'login';
    if (segment === 'not-found') return 'not-found';
    if (
      (segment === 'dashboard' || segment === '') &&
      (user?.role === 'super_admin' || user?.role === 'platform_admin')
    ) {
      return 'super-dashboard';
    }
    return segment || 'dashboard';
  }, [location.pathname, user?.role]);

  const page = resolvePageSeo(tab);
  const siteName = systemName?.trim() || SEO_SITE.name;

  useDocumentSeo({
    title: page.title,
    description: page.description,
    path: page.path,
    robots: page.robots,
    image: systemLogoUrl,
    siteName,
  });

  return null;
}
