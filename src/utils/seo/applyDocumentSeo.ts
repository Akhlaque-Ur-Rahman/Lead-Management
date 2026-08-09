import { SEO_SITE, formatDocumentTitle } from '../../config/seo';

export type DocumentSeoInput = {
  title: string;
  description?: string;
  path?: string;
  robots?: string;
  image?: string | null;
  siteName?: string;
  noSuffix?: boolean;
};

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  const selector = `meta[${attr}="${key}"]`;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/** Sync document title + primary SEO meta tags (SPA-friendly). */
export function applyDocumentSeo(input: DocumentSeoInput) {
  const siteName = input.siteName || SEO_SITE.name;
  const title = input.noSuffix
    ? input.title.trim() || siteName
    : formatDocumentTitle(input.title, siteName);
  const description = (input.description || SEO_SITE.description).trim();
  const path = input.path || (typeof window !== 'undefined' ? window.location.pathname : '/');
  const url = `${SEO_SITE.url}${path.startsWith('/') ? path : `/${path}`}`;
  // Prefer absolute HTTP(S) images for OG/Twitter; skip huge data: URLs
  const rawImage = input.image || SEO_SITE.defaultImage;
  const image =
    rawImage && !rawImage.startsWith('data:')
      ? rawImage.startsWith('http')
        ? rawImage
        : `${SEO_SITE.url}${rawImage.startsWith('/') ? rawImage : `/${rawImage}`}`
      : SEO_SITE.defaultImage;
  const robots = input.robots || 'noindex, nofollow';

  document.title = title;

  upsertMeta('name', 'description', description);
  upsertMeta('name', 'application-name', siteName);
  upsertMeta('name', 'apple-mobile-web-app-title', siteName);
  upsertMeta('name', 'theme-color', SEO_SITE.themeColor);
  upsertMeta('name', 'robots', robots);
  upsertMeta('name', 'googlebot', robots);

  upsertMeta('property', 'og:site_name', siteName);
  upsertMeta('property', 'og:locale', SEO_SITE.locale);
  upsertMeta('property', 'og:type', 'website');
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:url', url);
  upsertMeta('property', 'og:image', image);

  upsertMeta('name', 'twitter:card', 'summary');
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', description);
  if (SEO_SITE.twitterHandle) upsertMeta('name', 'twitter:site', SEO_SITE.twitterHandle);
  upsertMeta('name', 'twitter:image', image);

  upsertLink('canonical', url);
}
