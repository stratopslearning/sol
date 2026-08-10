import type { MetadataRoute } from 'next';

import { absoluteUrl, siteOrigin } from '@/lib/siteUrl';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/docs', '/docs/', '/login', '/signup', '/llms.txt'],
      disallow: [
        '/dashboard/',
        '/api/',
        '/quiz/',
        '/payment/',
        '/chatbot/',
      ],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
    host: siteOrigin(),
  };
}
