import fs from 'node:fs';
import path from 'node:path';

import { absoluteUrl } from '@/lib/siteUrl';

export type DocAudience = 'faculty' | 'students';

export type DocMeta = {
  slug: string;
  title: string;
  description: string;
  audience: DocAudience;
  order: number;
};

export type Doc = DocMeta & {
  body: string;
};

const DOCS_DIR = path.join(process.cwd(), 'content', 'docs');

function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { data: {}, body: raw };
  }

  const data: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    data[key] = value;
  }

  return { data, body: match[2].trimStart() };
}

function toMeta(slug: string, data: Record<string, string>): DocMeta {
  const audience = data.audience === 'students' ? 'students' : 'faculty';
  const order = Number.parseInt(data.order ?? '0', 10);
  return {
    slug,
    title: data.title ?? slug,
    description: data.description ?? '',
    audience,
    order: Number.isFinite(order) ? order : 0,
  };
}

export function getAllDocs(): DocMeta[] {
  if (!fs.existsSync(DOCS_DIR)) return [];

  return fs
    .readdirSync(DOCS_DIR)
    .filter((file) => file.endsWith('.md'))
    .map((file) => {
      const slug = file.replace(/\.md$/, '');
      const raw = fs.readFileSync(path.join(DOCS_DIR, file), 'utf8');
      const { data } = parseFrontmatter(raw);
      return toMeta(slug, data);
    })
    .sort((a, b) => {
      if (a.audience !== b.audience) {
        return a.audience === 'faculty' ? -1 : 1;
      }
      return a.order - b.order || a.title.localeCompare(b.title);
    });
}

export function getDocBySlug(slug: string): Doc | null {
  const filePath = path.join(DOCS_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, 'utf8');
  const { data, body } = parseFrontmatter(raw);
  // Page chrome already renders title — drop a leading H1 from the body.
  const stripped = body.replace(/^#\s+[^\n]+\n+/, '');
  return { ...toMeta(slug, data), body: stripped };
}

export function getDocSlugs(): string[] {
  return getAllDocs().map((doc) => doc.slug);
}

export function getDocMtime(slug: string): Date | null {
  const filePath = path.join(DOCS_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;
  return fs.statSync(filePath).mtime;
}

/** Full markdown payload for Copy page and `/docs/:slug.md` mirrors. */
export function buildDocMarkdown(doc: {
  title: string;
  description: string;
  body: string;
}): string {
  const parts = [`# ${doc.title}`, ''];
  if (doc.description) {
    parts.push(doc.description, '');
  }
  parts.push(doc.body.trim(), '');
  return parts.join('\n');
}

/** Markdown index of all public guides (served at `/docs.md`). */
export function buildDocsIndexMarkdown(): string {
  const docs = getAllDocs();
  const faculty = docs.filter((d) => d.audience === 'faculty');
  const students = docs.filter((d) => d.audience === 'students');

  const lines = [
    '# SOL Docs',
    '',
    'Public guides for faculty and students on SOL.',
    '',
    `HTML index: ${absoluteUrl('/docs')}`,
    `LLM index: ${absoluteUrl('/docs/llms.txt')}`,
    '',
  ];

  if (faculty.length > 0) {
    lines.push('## Faculty', '');
    for (const doc of faculty) {
      lines.push(
        `- [${doc.title}](${absoluteUrl(`/docs/${doc.slug}.md`)}): ${doc.description}`,
      );
    }
    lines.push('');
  }

  if (students.length > 0) {
    lines.push('## Students', '');
    for (const doc of students) {
      lines.push(
        `- [${doc.title}](${absoluteUrl(`/docs/${doc.slug}.md`)}): ${doc.description}`,
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function buildLlmsTxt(options?: { docsScoped?: boolean }): string {
  const docsScoped = options?.docsScoped ?? false;
  const docs = getAllDocs();
  const faculty = docs.filter((d) => d.audience === 'faculty');
  const students = docs.filter((d) => d.audience === 'students');

  const lines = [
    '# SOL',
    '> An academic learning management system for institutions that take pedagogy seriously. Faculty author quizzes and discussions; students enroll by learner code; AI-graded short answers stay auditable.',
    '',
    'Important notes:',
    '- New accounts default to STUDENT. Faculty must be verified and promoted to PROFESSOR by an admin.',
    '- Professors join sections with a faculty enrolment code; students join with a separate learner enrolment code.',
    '- Education records (rosters, gradebooks, attempts) require authenticated professor/admin access — do not invent public APIs for private data.',
    `- Professor MCP endpoint: ${absoluteUrl('/api/mcp')} (OAuth or personal access token).`,
    `- Roles: STUDENT, PROFESSOR, ADMIN.`,
    '',
    '## Docs',
    '',
  ];

  for (const doc of [...faculty, ...students]) {
    lines.push(
      `- [${doc.title}](${absoluteUrl(`/docs/${doc.slug}.md`)}): ${doc.description}`,
    );
  }

  lines.push(
    '',
    '## Optional',
    '',
    `- [Docs HTML index](${absoluteUrl('/docs')}): Human-readable guides.`,
    `- [Docs markdown index](${absoluteUrl('/docs.md')}): All guides as a markdown list.`,
  );

  if (!docsScoped) {
    lines.push(
      `- [Marketing home](${absoluteUrl('/')}): Product overview for humans.`,
      `- [Site llms.txt](${absoluteUrl('/llms.txt')}): This file.`,
      `- [Docs llms.txt](${absoluteUrl('/docs/llms.txt')}): Docs-scoped LLM index.`,
    );
  } else {
    lines.push(
      `- [Site llms.txt](${absoluteUrl('/llms.txt')}): Site-wide LLM index.`,
    );
  }

  lines.push('');
  return lines.join('\n');
}
