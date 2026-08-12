import type { HTMLAttributes, ReactNode } from 'react';
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

function headingText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(headingText).join('');
  }
  if (node && typeof node === 'object' && 'props' in node) {
    return headingText(
      (node as { props?: { children?: ReactNode } }).props?.children,
    );
  }
  return '';
}

/** GitHub-style slug so in-page `#…` links in docs resolve. */
function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu, '')
    .replace(/ /g, '-');
}

function Heading({
  as: Tag,
  children,
  ...props
}: {
  as: 'h2' | 'h3' | 'h4';
  children?: ReactNode;
} & HTMLAttributes<HTMLHeadingElement>) {
  const id = slugifyHeading(headingText(children));
  return (
    <Tag id={id || undefined} {...props}>
      {children}
    </Tag>
  );
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
  h2({ children, ...props }) {
    return (
      <Heading as="h2" {...props}>
        {children}
      </Heading>
    );
  },
  h3({ children, ...props }) {
    return (
      <Heading as="h3" {...props}>
        {children}
      </Heading>
    );
  },
  h4({ children, ...props }) {
    return (
      <Heading as="h4" {...props}>
        {children}
      </Heading>
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
