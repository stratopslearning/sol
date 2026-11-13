'use client';

import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';

import { Button } from '@/components/ui/button';
import { apiUrl } from '@/lib/basePath';

type Props = {
  bookId: string;
  title: string;
};

/**
 * Renders a hosted PDF book via pdf.js using a same-origin student file URL.
 */
export function BookPdfViewer({ bookId, title }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url,
        ).toString();

        const url = apiUrl(`/api/student/books/${bookId}/file`);
        const doc = await pdfjs.getDocument({ url }).promise;
        if (cancelled) return;
        pdfRef.current = doc;
        setPageCount(doc.numPages);
        setPage(1);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Could not load PDF',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
      pdfRef.current = null;
    };
  }, [bookId]);

  useEffect(() => {
    let cancelled = false;
    async function renderPage() {
      const pdf = pdfRef.current;
      const canvas = canvasRef.current;
      if (!pdf || !canvas || page < 1) return;
      try {
        const pdfPage = await pdf.getPage(page);
        if (cancelled) return;
        const viewport = pdfPage.getViewport({ scale: 1.25 });
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await pdfPage.render({
          canvas,
          canvasContext: ctx,
          viewport,
        }).promise;
      } catch {
        if (!cancelled) setError('Could not render page');
      }
    }
    void renderPage();
    return () => {
      cancelled = true;
    };
  }, [page, pageCount, loading]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-muted">{title}</p>
        {pageCount > 0 ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="text-sm text-ink-muted">
              Page {page} of {pageCount}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            >
              Next
            </Button>
          </div>
        ) : null}
      </div>
      {loading ? (
        <p className="text-sm text-ink-muted">Loading PDF…</p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="overflow-auto rounded-lg border border-rule bg-white">
        <canvas ref={canvasRef} className="mx-auto max-w-full" />
      </div>
    </div>
  );
}
