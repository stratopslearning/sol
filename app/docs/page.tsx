import type { Metadata } from 'next';
import {
  BookOpen,
  ClipboardList,
  KeyRound,
  Users,
} from 'lucide-react';

import { DocsLayout } from '@/components/docs/DocsLayout';
import { DocsQuickstart } from '@/components/docs/DocsQuickstart';
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

const CARDS = [
  {
    slug: 'about-sol',
    icon: BookOpen,
    title: 'About SOL',
    body: 'What the platform is, who it is for, roles, and the public URLs agents can cite.',
  },
  {
    slug: 'professor-onboarding',
    icon: ClipboardList,
    title: 'Faculty onboarding',
    body: 'From first sign-up through a teaching term: verify, join sections, assign work.',
  },
  {
    slug: 'student-getting-started',
    icon: Users,
    title: 'Student getting started',
    body: 'Sign in, join with a learner code, and find quizzes, discussions, and grades.',
  },
  {
    slug: 'professor-agent-access',
    icon: KeyRound,
    title: 'Agent Access',
    body: 'Connect Claude, ChatGPT, or Cursor to faculty work through MCP.',
  },
] as const;

export default function DocsIndexPage() {
  const docs = getAllDocs();

  return (
    <DocsShell>
      <DocsLayout docs={docs}>
        <header>
          <h1
            className="font-display text-ink"
            style={{
              fontSize: 'clamp(2.25rem, 4.5vw, 3.5rem)',
              lineHeight: 1.08,
              fontVariationSettings: '"opsz" 96, "SOFT" 30',
            }}
          >
            Welcome to SOL Docs.
          </h1>
          <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-ink-muted md:text-lg">
            How faculty get set up, how students join a section, and how to
            connect an AI agent to the teaching workflow.{' '}
            <a
              href={withBasePath('/docs/about-sol')}
              className="text-ink underline decoration-brand-soft underline-offset-2 hover:decoration-brand"
            >
              About SOL
            </a>
            {' · '}
            <a
              href={withBasePath('/docs/professor-agent-access')}
              className="text-ink underline decoration-brand-soft underline-offset-2 hover:decoration-brand"
            >
              Agent Access
            </a>
            .
          </p>
        </header>

        <DocsQuickstart
          agentUrl={absoluteUrl('/docs/professor-agent-access')}
          markdownUrl={absoluteUrl('/docs.md')}
          llmsUrl={absoluteUrl('/docs/llms.txt')}
        />

        <div className="mt-12 grid gap-3 sm:grid-cols-2">
          {CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <a
                key={card.slug}
                href={withBasePath(`/docs/${card.slug}`)}
                className="group flex flex-col gap-3 rounded-lg border border-rule bg-surface p-6 paper-shadow transition-colors hover:border-rule-strong hover:bg-surface-sunken"
              >
                <Icon className="h-5 w-5 text-brand" />
                <h2
                  className="font-display text-ink group-hover:text-brand"
                  style={{
                    fontSize: '1.2rem',
                    lineHeight: 1.25,
                    fontVariationSettings: '"opsz" 36',
                  }}
                >
                  {card.title}
                </h2>
                <p className="text-sm leading-relaxed text-ink-muted">
                  {card.body}
                </p>
              </a>
            );
          })}
        </div>
      </DocsLayout>
    </DocsShell>
  );
}
