'use client';

import { useEffect, useState, type ReactNode } from 'react';
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
import { cn } from '@/lib/utils';

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

function fileUrl(
  target: MaterialPreviewTarget,
  disposition: 'inline' | 'attachment',
) {
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

function PreviewStatus({
  loading,
  error,
  loadingLabel = 'Loading…',
  action,
}: {
  loading: boolean;
  error: string | null;
  loadingLabel?: string;
  action?: ReactNode;
}) {
  if (!loading && !error) return null;
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 p-6 text-center">
      {loading ? (
        <p className="text-sm text-ink-muted">{loadingLabel}</p>
      ) : (
        <>
          <p className="max-w-md text-sm text-destructive">{error}</p>
          {action}
        </>
      )}
    </div>
  );
}

/**
 * Browser-native PDF preview via blob URL.
 * Avoids pdf.js + Next.js "Object.defineProperty called on non-object" in dev.
 */
function PreviewPdfPane({ url }: { url: string }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function load() {
      setLoading(true);
      setError(null);
      setBlobUrl(null);
      try {
        const res = await fetch(url, { credentials: 'same-origin' });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            (data as { error?: string }).error ||
              `Could not load PDF (${res.status})`,
          );
        }
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(
          blob.type === 'application/pdf'
            ? blob
            : new Blob([blob], { type: 'application/pdf' }),
        );
        setBlobUrl(objectUrl);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load PDF');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-surface-sunken/40">
      <PreviewStatus
        loading={loading}
        error={error}
        loadingLabel="Loading PDF…"
        action={
          <Button asChild variant="outline" size="sm">
            <a href={url} target="_blank" rel="noreferrer">
              Open file in new tab
            </a>
          </Button>
        }
      />
      {blobUrl ? (
        <iframe
          title="PDF preview"
          src={blobUrl}
          className={cn(
            'min-h-0 w-full flex-1 border-0 bg-white',
            (loading || error) && 'invisible',
          )}
        />
      ) : null}
    </div>
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
      setLoading(false);
      return;
    }

    const isUrlDoc =
      target.kind === 'knowledge' && target.sourceKind === 'URL';
    if (isUrlDoc && target.externalUrl) {
      setText(null);
      setError(null);
      setLoading(false);
      return;
    }

    if (!isText(target.mimeType, target.title)) {
      setText(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function loadText() {
      setLoading(true);
      setError(null);
      setText(null);
      try {
        const res = await fetch(fileUrl(target!, 'inline'), {
          credentials: 'same-origin',
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            (data as { error?: string }).error || 'Could not load preview',
          );
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

  const inlineUrl = target ? fileUrl(target, 'inline') : null;
  const downloadUrl = target ? fileUrl(target, 'attachment') : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex h-[min(96vh,72rem)] w-[min(98vw,92rem)] max-w-none flex-col gap-0 overflow-hidden rounded-xl p-0 sm:max-w-none',
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-rule px-5 py-3.5 pr-14">
          <DialogHeader className="min-w-0 flex-1 space-y-0.5 text-left">
            <DialogTitle className="truncate text-left text-base sm:text-lg">
              {title}
            </DialogTitle>
            {target?.status && target.status !== 'READY' ? (
              <p className="text-xs text-ink-muted">
                Still indexing ({target.status}). Preview may be incomplete.
              </p>
            ) : (
              <p className="text-xs text-ink-muted">
                {pdf
                  ? 'PDF preview'
                  : md
                    ? 'Markdown'
                    : plain
                      ? 'Text'
                      : docx
                        ? 'Word document'
                        : 'File preview'}
              </p>
            )}
          </DialogHeader>
          {target && (inlineUrl || downloadUrl || target.externalUrl) ? (
            <div className="flex shrink-0 flex-wrap gap-2">
              {target.externalUrl ? (
                <Button asChild variant="outline" size="sm">
                  <a href={target.externalUrl} target="_blank" rel="noreferrer">
                    Open link
                  </a>
                </Button>
              ) : null}
              {downloadUrl && !urlOnly ? (
                <Button asChild variant="outline" size="sm">
                  <a href={downloadUrl} download>
                    Download
                  </a>
                </Button>
              ) : null}
              {inlineUrl && pdf ? (
                <Button asChild variant="ghost" size="sm">
                  <a href={inlineUrl} target="_blank" rel="noreferrer">
                    Open file
                  </a>
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col">
          {urlOnly && target?.externalUrl ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <p className="text-sm text-ink-muted">
                This material is a linked URL — open it in a new tab.
              </p>
              <Button asChild variant="outline" size="sm">
                <a href={target.externalUrl} target="_blank" rel="noreferrer">
                  Open link
                </a>
              </Button>
            </div>
          ) : null}

          {pdf && inlineUrl ? <PreviewPdfPane url={inlineUrl} /> : null}

          {(md || plain) && (
            <div className="relative min-h-0 flex-1 overflow-auto">
              <PreviewStatus
                loading={loading}
                error={error}
                action={
                  downloadUrl ? (
                    <Button asChild variant="outline" size="sm">
                      <a href={downloadUrl} download>
                        Download file
                      </a>
                    </Button>
                  ) : null
                }
              />
              {!loading && !error ? (
                <div className="p-6 sm:p-10">
                  {md ? (
                    <div className="prose prose-sm mx-auto max-w-3xl dark:prose-invert">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {text ?? ''}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <pre className="mx-auto max-w-4xl whitespace-pre-wrap font-mono text-sm leading-relaxed">
                      {text}
                    </pre>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {docx && downloadUrl ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <p className="text-sm text-ink-muted">
                DOCX files open best in Word or your editor after download.
              </p>
              <Button asChild variant="outline" size="sm">
                <a href={downloadUrl} download>
                  Download DOCX
                </a>
              </Button>
            </div>
          ) : null}

          {!urlOnly && !pdf && !md && !plain && !docx && target && downloadUrl ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <p className="text-sm text-ink-muted">
                No inline preview for this file type.
              </p>
              <Button asChild variant="outline" size="sm">
                <a href={downloadUrl} download>
                  Download file
                </a>
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
