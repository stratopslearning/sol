'use client';

import { useState } from 'react';
import { Check, Copy } from '@/components/icons';

import { cn } from '@/lib/utils';

export function CodeChip({
  label,
  code,
  className,
}: {
  label: string;
  code: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      title={`Copy ${label} code`}
      className={cn(
        'group inline-flex max-w-full items-center gap-2 rounded-full border border-rule/80 bg-surface-sunken/60 px-3 py-1.5 text-left transition-colors',
        'hover:border-rule-strong hover:bg-surface-elevated',
        className,
      )}
    >
      <span className="text-[0.65rem] font-medium uppercase tracking-[0.08em] text-ink-faint">
        {label}
      </span>
      <code className="truncate font-mono text-xs text-ink">{code}</code>
      <span className="shrink-0 text-ink-faint group-hover:text-ink-muted">
        {copied ? (
          <Check className="h-3.5 w-3.5 text-success" aria-hidden />
        ) : (
          <Copy className="h-3.5 w-3.5" aria-hidden />
        )}
      </span>
    </button>
  );
}
