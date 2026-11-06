import { describe, expect, it } from 'vitest';

import {
  isKnowledgeZipUpload,
  normalizeZipEntryPath,
} from '@/lib/knowledge/zipImport';

describe('normalizeZipEntryPath', () => {
  it('normalizes slashes and strips leading slash', () => {
    expect(normalizeZipEntryPath('\\Week 1\\syllabus.pdf')).toBe(
      'Week 1/syllabus.pdf',
    );
    expect(normalizeZipEntryPath('/notes/a.md')).toBe('notes/a.md');
  });

  it('rejects zip-slip and junk', () => {
    expect(normalizeZipEntryPath('../secret.pdf')).toBeNull();
    expect(normalizeZipEntryPath('a/../../b.pdf')).toBeNull();
    expect(normalizeZipEntryPath('__MACOSX/._x.pdf')).toBeNull();
    expect(normalizeZipEntryPath('.DS_Store')).toBeNull();
    expect(normalizeZipEntryPath('folder/')).toBeNull();
  });
});

describe('isKnowledgeZipUpload', () => {
  it('detects zip by extension or mime', () => {
    expect(isKnowledgeZipUpload('pack.zip', '')).toBe(true);
    expect(isKnowledgeZipUpload('pack', 'application/zip')).toBe(true);
    expect(isKnowledgeZipUpload('notes.pdf', 'application/pdf')).toBe(false);
  });
});
