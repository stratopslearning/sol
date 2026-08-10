import type { Metadata } from 'next';

import { DocsNav } from '@/components/docs/DocsNav';
import { DocsShell } from '@/components/docs/DocsShell';
import { withBasePath } from '@/lib/basePath';
import { getAllDocs } from '@/lib/docs';
import { absoluteUrl } from '@/lib/siteUrl';

export const metadata: Metadata = {
  title: 'Docs · SOL',
  description:
    'Guides for faculty and students — onboarding, coursework, and agent access.',
  alternates: {
    canonical: absoluteUrl('/docs'),
    types: {
      'text/markdown': absoluteUrl('/docs.md'),
    },
  },
  other: {
    'llms-txt': absoluteUrl('/docs/llms.txt'),
  },
};

export default function DocsIndexPage() {
  const docs = getAllDocs();
  const faculty = docs.filter((d) => d.audience === 'faculty');
  const students = docs.filter((d) => d.audience === 'students');

  return (
    <DocsShell>
      <div className="relative overflow-hidden border-b border-rule bg-[color-mix(in_oklch,var(--paper)_72%,transparent)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(40%_140px_at_20%_0%,color-mix(in_oklch,var(--brand)_14%,transparent),transparent)]"
        />
        <div className="relative mx-auto max-w-[1200px] px-4 py-14 md:px-8 md:py-20">
          <span className="eyebrow text-ink-faint">Guides</span>
          <h1
            className="mt-3 max-w-[18ch] font-display text-ink"
            style={{
              fontSize: 'clamp(2.25rem, 4vw, 3.25rem)',
              lineHeight: 1.1,
              fontVariationSettings: '"opsz" 72, "SOFT" 30',
            }}
          >
            Docs
          </h1>
          <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-ink-muted md:text-lg">
            How faculty get set up, how students join a section, and how to
            connect an AI agent to your teaching workflow.
          </p>
          <p className="mt-4 text-sm text-ink-faint">
            <a
              href={withBasePath('/docs/llms.txt')}
              className="underline decoration-brand-soft underline-offset-2 hover:decoration-brand"
            >
              llms.txt
            </a>
            {' · '}
            <a
              href={withBasePath('/docs.md')}
              className="underline decoration-brand-soft underline-offset-2 hover:decoration-brand"
            >
              Markdown index
            </a>
          </p>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-12 md:grid-cols-[220px_minmax(0,1fr)] md:gap-14 md:px-8 md:py-16">
        <aside className="md:sticky md:top-24 md:self-start">
          <DocsNav docs={docs} />
        </aside>

        <div className="space-y-12">
          <DocGroup
            label="Faculty"
            description="Verify your account, join sections, and teach day to day."
            docs={faculty}
          />
          <DocGroup
            label="Students"
            description="Join your section and find quizzes, discussions, and grades."
            docs={students}
          />
        </div>
      </div>
    </DocsShell>
  );
}

function DocGroup({
  label,
  description,
  docs,
}: {
  label: string;
  description: string;
  docs: ReturnType<typeof getAllDocs>;
}) {
  if (docs.length === 0) return null;

  return (
    <section>
      <header className="mb-6">
        <span className="eyebrow text-ink-faint">{label}</span>
        <p className="mt-2 text-sm text-ink-muted">{description}</p>
      </header>
      <ul className="divide-y divide-rule border-y border-rule">
        {docs.map((doc) => (
          <li key={doc.slug}>
            <a
              href={withBasePath(`/docs/${doc.slug}`)}
              className="group flex flex-col gap-1 py-5 transition-colors hover:bg-surface-sunken/60 md:flex-row md:items-baseline md:justify-between md:gap-8 md:px-2"
            >
              <span className="font-display text-lg text-ink group-hover:text-brand">
                {doc.title}
              </span>
              <span className="max-w-[48ch] text-sm leading-relaxed text-ink-muted md:text-right">
                {doc.description}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
