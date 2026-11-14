'use client';

import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';

import { Button } from '@/components/ui/button';
import { apiUrl } from '@/lib/basePath';
import { loadPdfDocument } from '@/lib/pdf/loadPdfDocument';

type Props = {
  bookId: string;
  title: string;
  audience?: 'student' | 'professor';
};

/**
 * Renders a hosted PDF book via pdf.js using a same-origin file URL.
 */
export function BookPdfViewer({
  bookId,
  title,
  audience = 'student',
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const path =
          audience === 'professor'
            ? `/api/professor/books/${bookId}/file`
            : `/api/student/books/${bookId}/file`;
        const url = apiUrl(path);
        const doc = await loadPdfDocument(url);
        if (cancelled) {
          void doc.destroy();
          return;
        }
        pdfRef.current = doc;
        setPageCount(doc.numPages);
        setPage(1);
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
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
      const doc = pdfRef.current;
      pdfRef.current = null;
      if (doc) void doc.destroy();
    };
  }, [bookId, audience]);

  useEffect(() => {
    let cancelled = false;
    async function renderPage() {
      const pdf = pdfRef.current;
      const canvas = canvasRef.current;
      if (!pdf || !canvas || page < 1 || loading) return;
      try {
        renderTaskRef.current?.cancel();
        renderTaskRef.current = null;

        const pdfPage = await pdf.getPage(page);
        if (cancelled) return;
        const viewport = pdfPage.getViewport({ scale: 1.25 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const task = pdfPage.render({ canvas, viewport });
        renderTaskRef.current = task;
        await task.promise;
      } catch (err) {
        if (cancelled) return;
        const name = err instanceof Error ? err.name : '';
        if (name === 'RenderingCancelledException') return;
        setError('Could not render page');
      }
    }
    void renderPage();
    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
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
