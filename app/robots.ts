import type { MetadataRoute } from 'next';

import { solDemoOnly } from '@/lib/solHosts';
import { absoluteUrl, siteOrigin } from '@/lib/siteUrl';

export default function robots(): MetadataRoute.Robots {
  const allow = [
    '/',
    '/docs',
    '/docs/',
    '/blog',
    '/blog/',
    '/llms.txt',
    '/security',
    '/privacy',
    '/terms',
    '/dmca',
  ];
  // StratOps still exposes auth routes; teachwithsol is demo-only.
  if (!solDemoOnly()) {
    allow.push('/login', '/signup');
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow,
        disallow: [
          '/dashboard/',
          '/api/',
          '/quiz/',
          '/payment/',
          '/chatbot/',
          '/interactive/',
          ...(solDemoOnly() ? ['/login', '/signup'] : []),
        ],
      },
      // Helpful for answer engines that honor AI crawler tags.
      {
        userAgent: 'GPTBot',
        allow: ['/', '/docs', '/docs/', '/blog', '/blog/', '/llms.txt', '/security'],
        disallow: ['/dashboard/', '/api/', '/quiz/', '/payment/'],
      },
      {
        userAgent: 'Google-Extended',
        allow: ['/', '/docs', '/docs/', '/blog', '/blog/', '/llms.txt', '/security'],
        disallow: ['/dashboard/', '/api/', '/quiz/', '/payment/'],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: siteOrigin(),
  };
}
