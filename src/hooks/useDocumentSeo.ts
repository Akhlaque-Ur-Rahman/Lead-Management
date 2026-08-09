import { useEffect } from 'react';
import { applyDocumentSeo, type DocumentSeoInput } from '../utils/seo/applyDocumentSeo';

/** Apply document SEO tags from any page (Login, 404, or outside AppShell). */
export function useDocumentSeo(seo: DocumentSeoInput) {
  const { title, description, path, robots, image, siteName, noSuffix } = seo;

  useEffect(() => {
    applyDocumentSeo({ title, description, path, robots, image, siteName, noSuffix });
  }, [title, description, path, robots, image, siteName, noSuffix]);
}
