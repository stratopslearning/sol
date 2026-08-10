import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { withBasePath } from '@/lib/basePath';

function resolveHref(href: string | undefined): string | undefined {
  if (!href) return href;
  if (
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('mailto:') ||
    href.startsWith('#')
  ) {
    return href;
  }
  if (href.startsWith('/')) {
    return withBasePath(href);
  }
  return href;
}

const components: Components = {
  a({ href, children, ...props }) {
    const resolved = resolveHref(href);
    const external =
      resolved?.startsWith('http://') || resolved?.startsWith('https://');
    return (
      <a
        href={resolved}
        {...(external
          ? { target: '_blank', rel: 'noopener noreferrer' }
          : {})}
        {...props}
      >
        {children}
      </a>
    );
  },
  table({ children, ...props }) {
    return (
      <div className="docs-table-wrap">
        <table {...props}>{children}</table>
      </div>
    );
  },
};

export function DocsMarkdown({ content }: { content: string }) {
  return (
    <div className="docs-prose" data-prose>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
