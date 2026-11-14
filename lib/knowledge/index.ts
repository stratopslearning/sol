export {
  listTeachableCourses,
  assertCanManageCourse,
  assertCanManageMaterial,
  type TeachableCourse,
} from '@/lib/knowledge/access';
export {
  listCourseMaterials,
  getCourseMaterial,
  addMaterialFromUrl,
  addMaterialFromUpload,
  importCourseMaterialsFromZip,
  softDeleteMaterial,
  softDeleteMaterials,
  setMaterialAuthoringCorpus,
  type MaterialSummary,
  type CourseMaterialsZipImportResult,
} from '@/lib/knowledge/materials';
export { processMaterial, processPendingMaterials } from '@/lib/knowledge/process';
export { scheduleMaterialProcess } from '@/lib/knowledge/scheduleProcess';
export {
  retrieveCourseChunks,
  buildSafeMaterialsContext,
  buildCitationFootnotes,
} from '@/lib/knowledge/retrieve';
export { purgeMaterial } from '@/lib/knowledge/purge';
export { chunkText } from '@/lib/knowledge/chunk';
export {
  isS3Configured,
  getMaterialObjectPresignedUrl,
} from '@/lib/knowledge/storage';
export {
  knowledgeMaterialDisplayStatus,
  knowledgeMaterialDisplayDetail,
  type MaterialDisplayStatus,
} from '@/lib/knowledge/displayStatus';
export {
  listWorkspaceDocuments,
  listCourseLinkedDocuments,
  linkDocumentToCourse,
  unlinkDocumentFromCourse,
  setLinkedDocumentAuthoringCorpus,
  acceptLinkedDocumentUpdate,
  dismissLinkedDocumentUpdate,
  shareDocumentToLibrary,
  cloneCourseKnowledgeLinks,
  addWorkspaceDocumentFromUrl,
  addWorkspaceDocumentFromUpload,
  importWorkspaceDocumentsFromZip,
  addDocumentVersionFromUpload,
  softDeleteKnowledgeDocument,
  renameKnowledgeDocument,
  renameKnowledgeFolder,
  reprocessDocumentForUser,
  restoreDocumentVersionForUser,
  listVersionsForUser,
  type KnowledgeDocumentSummary,
  type KnowledgeZipImportResult,
} from '@/lib/knowledge/documents';
export {
  assertWorkspaceFaculty,
  assertWorkspaceLibraryAdmin,
} from '@/lib/knowledge/workspaceAccess';
export {
  isKnowledgeZipUpload,
  type ZipImportSkip,
} from '@/lib/knowledge/zipImport';
export { scheduleKnowledgeDocumentProcess } from '@/lib/knowledge/scheduleDocumentProcess';
export { processKnowledgeDocument } from '@/lib/knowledge/processDocument';
export {
  listWorkspaceConnectors,
  upsertConnectorDraft,
  buildConnectorAuthorizeUrl,
  completeConnectorOAuth,
  updateConnectorConfig,
  scheduleConnectorSync,
  disconnectConnector,
  listRecentSyncRuns,
  type ConnectorSummary,
} from '@/lib/knowledge/connectors/manage';
export type { KnowledgeProvider } from '@/lib/knowledge/connectors/types';
export {
  listConnectorAdapters,
  isConnectorProviderConfigured,
  listConnectorProviderStatus,
} from '@/lib/knowledge/connectors/index';
