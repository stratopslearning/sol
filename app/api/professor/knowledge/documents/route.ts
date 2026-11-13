import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { apiErrorResponse } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import {
  addWorkspaceDocumentFromUpload,
  addWorkspaceDocumentFromUrl,
  importWorkspaceDocumentsFromZip,
  isKnowledgeZipUpload,
  listCourseLinkedDocuments,
  listWorkspaceDocuments,
  renameKnowledgeFolder,
} from '@/lib/knowledge';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const urlBodySchema = z.object({
  workspaceId: z.string().uuid(),
  url: z.string().url(),
  title: z.string().min(1).max(300).optional(),
  courseId: z.string().uuid().optional(),
});

const renameFolderSchema = z.object({
  action: z.literal('rename_folder'),
  workspaceId: z.string().uuid(),
  fromFolder: z.string().min(1).max(200),
  toFolder: z.string().min(1).max(200),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await requireProfessorApi(req, { scope: 'read' });
    const limited = await enforceRateLimit({
      key: `professor-read:${auth.user.id}`,
      limit: 120,
      windowMs: 60_000,
      prefix: 'rl',
    });
    if (limited) return limited;

    const workspaceId = req.nextUrl.searchParams.get('workspaceId');
    const courseId = req.nextUrl.searchParams.get('courseId');

    if (courseId) {
      const documents = await listCourseLinkedDocuments(auth.user, courseId);
      return NextResponse.json({ documents });
    }
    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId or courseId is required' },
        { status: 400 },
      );
    }
    const documents = await listWorkspaceDocuments(auth.user, workspaceId);
    return NextResponse.json({ documents });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireProfessorApi(req, {
      scope: 'materials:write',
      professorOnly: true,
    });
    const limited = await enforceRateLimit({
      key: `professor-knowledge-write:${auth.user.id}`,
      limit: 30,
      windowMs: 60_000,
      prefix: 'rl',
    });
    if (limited) return limited;

    const body = renameFolderSchema.parse(await req.json());
    const result = await renameKnowledgeFolder(
      auth.user,
      body.workspaceId,
      body.fromFolder,
      body.toFolder,
    );
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireProfessorApi(req, {
      scope: 'materials:write',
      professorOnly: true,
    });
    const limited = await enforceRateLimit({
      key: `professor-knowledge-write:${auth.user.id}`,
      limit: 30,
      windowMs: 60_000,
      prefix: 'rl',
    });
    if (limited) return limited;

    const contentType = req.headers.get('content-type') ?? '';
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const workspaceId = String(form.get('workspaceId') ?? '');
      const courseId = form.get('courseId')
        ? String(form.get('courseId'))
        : undefined;
      const title = form.get('title') ? String(form.get('title')) : undefined;
      const file = form.get('file');
      if (!workspaceId || !(file instanceof File)) {
        return NextResponse.json(
          { error: 'workspaceId and file are required' },
          { status: 400 },
        );
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileName = file.name || 'upload.bin';
      const mimeType = file.type || 'application/octet-stream';

      if (isKnowledgeZipUpload(fileName, mimeType)) {
        const result = await importWorkspaceDocumentsFromZip(auth.user, {
          workspaceId,
          fileName,
          buffer,
          courseId,
        });
        return NextResponse.json(
          {
            zip: true,
            documents: result.documents,
            imported: result.imported,
            skipped: result.skipped,
          },
          { status: 201 },
        );
      }

      const document = await addWorkspaceDocumentFromUpload(auth.user, {
        workspaceId,
        title:
          title?.trim() ||
          fileName.replace(/\.[^.]+$/, '') ||
          'Untitled document',
        fileName,
        mimeType,
        buffer,
        courseId,
      });
      return NextResponse.json({ document }, { status: 201 });
    }

    const json = urlBodySchema.parse(await req.json());
    const document = await addWorkspaceDocumentFromUrl(auth.user, {
      workspaceId: json.workspaceId,
      url: json.url,
      title: json.title?.trim() || json.url,
      courseId: json.courseId,
    });
    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
