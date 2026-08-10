import { withBasePath } from '@/lib/basePath';
import type { DocMeta } from '@/lib/docs';
import { cn } from '@/lib/utils';

export function DocsNav({
  docs,
  activeSlug,
}: {
  docs: DocMeta[];
  activeSlug?: string;
}) {
  const faculty = docs.filter((d) => d.audience === 'faculty');
  const students = docs.filter((d) => d.audience === 'students');

  return (
    <nav aria-label="Guides" className="space-y-8">
      <div>
        <a
          href={withBasePath('/docs')}
          className={cn(
            'text-sm transition-colors',
            !activeSlug
              ? 'font-medium text-ink'
              : 'text-ink-muted hover:text-ink',
          )}
        >
          All guides
        </a>
      </div>

      <NavGroup label="Faculty" items={faculty} activeSlug={activeSlug} />
      <NavGroup label="Students" items={students} activeSlug={activeSlug} />
    </nav>
  );
}

function NavGroup({
  label,
  items,
  activeSlug,
}: {
  label: string;
  items: DocMeta[];
  activeSlug?: string;
}) {
  if (items.length === 0) return null;

  return (
    <div>
      <h2 className="eyebrow text-ink-faint">{label}</h2>
      <ul className="mt-3 space-y-2">
        {items.map((doc) => {
          const active = doc.slug === activeSlug;
          return (
            <li key={doc.slug}>
              <a
                href={withBasePath(`/docs/${doc.slug}`)}
                className={cn(
                  'block text-sm leading-snug transition-colors',
                  active
                    ? 'font-medium text-brand'
                    : 'text-ink-muted hover:text-ink',
                )}
                aria-current={active ? 'page' : undefined}
              >
                {doc.title}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
