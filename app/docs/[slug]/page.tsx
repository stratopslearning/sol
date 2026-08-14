import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CopyPageButton } from '@/components/docs/CopyPageButton';
import { DocsLayout } from '@/components/docs/DocsLayout';
import { DocsMarkdown } from '@/components/docs/DocsMarkdown';
import { DocsShell } from '@/components/docs/DocsShell';
import { JsonLd } from '@/components/seo/JsonLd';
import { withBasePath } from '@/lib/basePath';
import {
  buildDocMarkdown,
  getAllDocs,
  getDocBySlug,
  getDocMtime,
  getDocSlugs,
} from '@/lib/docs';
import { absoluteUrl } from '@/lib/siteUrl';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getDocSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const doc = getDocBySlug(slug);
  if (!doc) return { title: 'Docs · SOL' };

  const canonical = absoluteUrl(`/docs/${slug}`);
  const markdown = absoluteUrl(`/docs/${slug}.md`);

  return {
    title: `${doc.title} · SOL Docs`,
    description: doc.description,
    alternates: {
      canonical,
      types: {
        'text/markdown': markdown,
      },
    },
  };
}

export default async function DocPage({ params }: PageProps) {
  const { slug } = await params;
  const doc = getDocBySlug(slug);
  if (!doc) notFound();

  const docs = getAllDocs();
  const audienceLabel = doc.audience === 'faculty' ? 'Faculty' : 'Students';
  const copyMarkdown = buildDocMarkdown(doc);
  const pageUrl = absoluteUrl(`/docs/${doc.slug}`);
  const mtime = getDocMtime(doc.slug);

  return (
    <DocsShell>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'TechArticle',
          headline: doc.title,
          description: doc.description,
          url: pageUrl,
          mainEntityOfPage: pageUrl,
          dateModified: (mtime ?? new Date()).toISOString(),
          author: {
            '@type': 'Organization',
            name: 'SOL',
            url: absoluteUrl('/'),
          },
          publisher: {
            '@type': 'Organization',
            name: 'SOL',
            url: absoluteUrl('/'),
          },
          isPartOf: {
            '@type': 'WebSite',
            name: 'SOL Docs',
            url: absoluteUrl('/docs'),
          },
        }}
      />
      <DocsLayout docs={docs} activeSlug={doc.slug}>
        <article className="min-w-0">
          <header className="mb-10 border-b border-rule pb-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 text-sm text-ink-faint">
                <a
                  href={withBasePath('/docs')}
                  className="transition-colors hover:text-ink"
                >
                  Docs
                </a>
                <span aria-hidden>/</span>
                <span>{audienceLabel}</span>
              </div>
              <CopyPageButton markdown={copyMarkdown} />
            </div>
            <h1
              className="mt-4 font-display text-ink"
              style={{
                fontSize: 'clamp(1.875rem, 3.5vw, 2.75rem)',
                lineHeight: 1.15,
                fontVariationSettings: '"opsz" 60, "SOFT" 30',
              }}
            >
              {doc.title}
            </h1>
            {doc.description ? (
              <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-ink-muted">
                {doc.description}
              </p>
            ) : null}
          </header>

          <DocsMarkdown content={doc.body} />
        </article>
      </DocsLayout>
    </DocsShell>
  );
}
