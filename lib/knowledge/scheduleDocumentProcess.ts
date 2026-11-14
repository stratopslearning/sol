import { enqueueKnowledgeDocumentProcess } from '@/lib/jobs/enqueue';

export function scheduleKnowledgeDocumentProcess(
  documentId: string,
  workspaceId: string,
): void {
  void enqueueKnowledgeDocumentProcess(documentId, workspaceId).catch((err) => {
    console.error('[scheduleKnowledgeDocumentProcess]', { documentId, err });
  });
}
