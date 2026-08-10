import type { MetadataRoute } from 'next';

import { getAllDocs, getDocMtime } from '@/lib/docs';
import { absoluteUrl } from '@/lib/siteUrl';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const docs = getAllDocs();

  const entries: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl('/'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: absoluteUrl('/docs'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
  ];

  for (const doc of docs) {
    entries.push({
      url: absoluteUrl(`/docs/${doc.slug}`),
      lastModified: getDocMtime(doc.slug) ?? now,
      changeFrequency: 'monthly',
      priority: doc.slug === 'about-sol' ? 0.85 : 0.8,
    });
  }

  return entries;
}
