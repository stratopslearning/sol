export type GradeAttemptRequested = {
  name: 'grading/attempt.requested';
  data: {
    attemptId: string;
    /** Workspace concurrency key; use "default" before tenancy is always set. */
    workspaceId: string;
    tenantId?: string;
  };
};

export type GradeAttemptsBatchRequested = {
  name: 'grading/attempts.batch.requested';
  data: {
    attemptIds: string[];
    workspaceId: string;
    professorId?: string;
  };
};

export type MaterialProcessRequested = {
  name: 'knowledge/material.process';
  data: {
    materialId: string;
    workspaceId: string;
  };
};

export type KnowledgeDocumentProcessRequested = {
  name: 'knowledge/document.process';
  data: {
    documentId: string;
    workspaceId: string;
  };
};

export type KnowledgeConnectorSyncRequested = {
  name: 'knowledge/connector.sync';
  data: {
    connectorId: string;
    workspaceId: string;
  };
};

export type LtiPassbackDrainRequested = {
  name: 'lti/passback.drain';
  data: {
    limit?: number;
    workspaceId?: string;
  };
};

export type SolInngestEvents =
  | GradeAttemptRequested
  | GradeAttemptsBatchRequested
  | MaterialProcessRequested
  | KnowledgeDocumentProcessRequested
  | KnowledgeConnectorSyncRequested
  | LtiPassbackDrainRequested;
