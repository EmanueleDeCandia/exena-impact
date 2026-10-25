import { useEffect } from 'react';

function upsertMeta(selector, attributes, content) {
  let element = document.head.querySelector(selector);
  const created = !element;
  if (!element) {
    element = document.createElement('meta');
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    document.head.appendChild(element);
  }
  const previous = element.getAttribute('content');
  element.setAttribute('content', content);
  return () => {
    if (previous === null && created) element.remove();
    else if (previous !== null) element.setAttribute('content', previous);
  };
}

export function usePageMetadata({ title, description, path, image, index = false, type = 'website' }) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;
    const url = `${window.location.origin}${path}`;
    const cleanups = [
      upsertMeta('meta[name="description"]', { name: 'description' }, description),
      upsertMeta('meta[name="robots"]', { name: 'robots' }, index ? 'index, follow' : 'noindex, nofollow'),
      upsertMeta('meta[property="og:title"]', { property: 'og:title' }, title),
      upsertMeta('meta[property="og:description"]', { property: 'og:description' }, description),
      upsertMeta('meta[property="og:type"]', { property: 'og:type' }, type),
      upsertMeta('meta[property="og:url"]', { property: 'og:url' }, url),
      upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card' }, image ? 'summary_large_image' : 'summary'),
    ];
    if (image) cleanups.push(upsertMeta('meta[property="og:image"]', { property: 'og:image' }, `${window.location.origin}${image}`));
    let canonical = document.head.querySelector('link[rel="canonical"]');
    const createdCanonical = !canonical;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    const previousCanonical = canonical.getAttribute('href');
    canonical.setAttribute('href', url);
    return () => {
      document.title = previousTitle;
      cleanups.forEach((cleanup) => cleanup());
      if (createdCanonical) canonical.remove();
      else if (previousCanonical) canonical.setAttribute('href', previousCanonical);
    };
  }, [title, description, path, image, index, type]);
}

export function svgDataUrl(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
