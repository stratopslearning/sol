import { enqueueBookProcess } from '@/lib/jobs/enqueue';

/** Fire-and-forget book processing (Inngest or after()). */
export function scheduleBookProcess(
  bookId: string,
  workspaceId: string | null | undefined,
): void {
  void enqueueBookProcess(bookId, workspaceId ?? 'default').catch((err) => {
    console.error('[scheduleBookProcess]', { bookId, err });
  });
}
