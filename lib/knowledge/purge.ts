import { eq } from 'drizzle-orm';

import { db } from '@/app/db';
import { courseMaterialChunks, courseMaterials } from '@/app/db/schema';
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
  const material = await db.query.courseMaterials.findFirst({
    where: eq(courseMaterials.id, materialId),
  });
  if (!material) {
    throw new Error('Material not found');
  }

  await db
    .delete(courseMaterialChunks)
    .where(eq(courseMaterialChunks.materialId, materialId));

  if (material.s3Key) {
    try {
      await deleteMaterialObject(material.s3Key);
    } catch (err) {
      console.error('S3 delete during purge failed', material.s3Key, err);
      // Continue. DB purge still required for FERPA
    }
  }

  await db.delete(courseMaterials).where(eq(courseMaterials.id, materialId));

  return {
    s3Key: material.s3Key,
    courseId: material.courseId,
    title: material.title,
  };
}
