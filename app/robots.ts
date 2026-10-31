import type { MetadataRoute } from 'next';

import { absoluteUrl, siteOrigin } from '@/lib/siteUrl';
import { solDemoOnly } from '@/lib/solHosts';

export default function robots(): MetadataRoute.Robots {
  const allow = ['/', '/docs', '/docs/', '/llms.txt'];
  if (!solDemoOnly()) {
    allow.push('/login', '/signup');
  }

  return {
    rules: {
      userAgent: '*',
      allow,
      disallow: [
        '/dashboard/',
        '/api/',
        '/quiz/',
        '/payment/',
        '/chatbot/',
        ...(solDemoOnly() ? ['/login', '/signup'] : []),
      ],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
    host: siteOrigin(),
  };
}
