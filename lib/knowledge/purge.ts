import { deleteMaterialObject } from '@/lib/knowledge/storage';

/**
 * Hard-delete a material: chunks, S3 object, then row.
 * Caller must authorize (admin purge route).
 */
export async function purgeMaterial(materialId: string): Promise<{
  s3Key: string | null;
  courseId: string;
  title: string;
}> {
  const { adminPurgeCourseMaterialDefiner } = await import(
    '@/lib/db/knowledgeJobDefiners'
  );
  const purged = await adminPurgeCourseMaterialDefiner(materialId);

  if (purged.s3Key) {
    try {
      await deleteMaterialObject(purged.s3Key);
    } catch (err) {
      console.error('S3 delete during purge failed', purged.s3Key, err);
      // Continue — DB purge already completed for FERPA
    }
  }

  return {
    s3Key: purged.s3Key,
    courseId: purged.courseId,
    title: purged.title,
  };
}
