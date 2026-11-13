'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiUrl } from '@/lib/basePath';

export type MaterialPreviewTarget =
  | {
      kind: 'knowledge';
      id: string;
      title: string;
      mimeType?: string | null;
      externalUrl?: string | null;
      sourceKind?: string | null;
      status?: string | null;
      courseId?: string | null;
    }
  | {
      kind: 'legacy';
      id: string;
      title: string;
      mimeType?: string | null;
      externalUrl?: string | null;
      status?: string | null;
    };

function isPdf(mime: string | null | undefined, title: string) {
  return (
    (mime || '').toLowerCase().includes('pdf') ||
    title.toLowerCase().endsWith('.pdf')
  );
}

function isMarkdown(mime: string | null | undefined, title: string) {
  const m = (mime || '').toLowerCase();
  return (
    m.includes('markdown') ||
    title.toLowerCase().endsWith('.md') ||
    title.toLowerCase().endsWith('.markdown')
  );
}

function isText(mime: string | null | undefined, title: string) {
  const m = (mime || '').toLowerCase();
  return (
    m.startsWith('text/') ||
    title.toLowerCase().endsWith('.txt') ||
    isMarkdown(mime, title)
  );
}

function isDocx(mime: string | null | undefined, title: string) {
  const m = (mime || '').toLowerCase();
  return (
    m.includes('wordprocessingml') || title.toLowerCase().endsWith('.docx')
  );
}

function fileUrl(target: MaterialPreviewTarget, disposition: 'inline' | 'attachment') {
  if (target.kind === 'knowledge') {
    const q = new URLSearchParams({ disposition });
    if (target.courseId) q.set('courseId', target.courseId);
    return apiUrl(
      `/api/professor/knowledge/documents/${target.id}/file?${q.toString()}`,
    );
  }
  return apiUrl(
    `/api/professor/materials/${target.id}/file?disposition=${disposition}`,
  );
}

export function MaterialPreviewDialog({
  target,
  open,
  onOpenChange,
}: {
  target: MaterialPreviewTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !target) {
      setText(null);
      setError(null);
      return;
    }

    const isUrlDoc =
      target.kind === 'knowledge' && target.sourceKind === 'URL';
    if (isUrlDoc && target.externalUrl) {
      setText(null);
      setError(null);
      return;
    }

    if (!isText(target.mimeType, target.title)) {
      setText(null);
      setError(null);
      return;
    }

    let cancelled = false;
    async function loadText() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(fileUrl(target!, 'inline'));
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Could not load preview');
        }
        const body = await res.text();
        if (!cancelled) setText(body);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load preview');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadText();
    return () => {
      cancelled = true;
    };
  }, [open, target]);

  const title = target?.title ?? 'Preview';
  const mime = target?.mimeType;
  const pdf = target ? isPdf(mime, target.title) : false;
  const md = target ? isMarkdown(mime, target.title) : false;
  const plain = target ? isText(mime, target.title) && !md : false;
  const docx = target ? isDocx(mime, target.title) : false;
  const urlOnly =
    Boolean(target?.externalUrl) &&
    ((target?.kind === 'knowledge' && target.sourceKind === 'URL') ||
      (!pdf && !plain && !md && !docx));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-4 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{title}</DialogTitle>
        </DialogHeader>

        {target?.status && target.status !== 'READY' ? (
          <p className="text-sm text-muted-foreground">
            Still indexing ({target.status}). Preview may be incomplete.
          </p>
        ) : null}

        {urlOnly && target?.externalUrl ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              This material is a linked URL.
            </p>
            <Button asChild variant="outline" size="sm" className="w-fit">
              <a href={target.externalUrl} target="_blank" rel="noreferrer">
                Open link
              </a>
            </Button>
          </div>
        ) : null}

        {pdf && target ? (
          <iframe
            title={title}
            src={fileUrl(target, 'inline')}
            className="min-h-[60vh] w-full flex-1 rounded-md border border-border bg-white"
          />
        ) : null}

        {(md || plain) && (
          <div className="min-h-[40vh] flex-1 overflow-auto rounded-md border border-border bg-background p-4 text-sm">
            {loading ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : error ? (
              <p className="text-destructive">{error}</p>
            ) : md ? (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {text ?? ''}
                </ReactMarkdown>
              </div>
            ) : (
              <pre className="whitespace-pre-wrap font-mono text-xs">
                {text}
              </pre>
            )}
          </div>
        )}

        {docx && target ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              DOCX files download for preview in your editor.
            </p>
            <Button asChild variant="outline" size="sm" className="w-fit">
              <a href={fileUrl(target, 'attachment')} download>
                Download DOCX
              </a>
            </Button>
          </div>
        ) : null}

        {!urlOnly && !pdf && !md && !plain && !docx && target ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              No inline preview for this file type.
            </p>
            <Button asChild variant="outline" size="sm" className="w-fit">
              <a href={fileUrl(target, 'attachment')} download>
                Download file
              </a>
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
