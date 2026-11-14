import './lib/bootstrapDevDb';

import { eq } from 'drizzle-orm';

import { db } from '@/app/db';
import { hostedBooks } from '@/app/db/schema';
import { processBook } from '@/lib/books/process';

async function main() {
  const id = process.argv[2];
  if (!id) {
    console.error('Usage: tsx scripts/reprocess-book-once.ts <bookId>');
    process.exit(1);
  }
  await db
    .update(hostedBooks)
    .set({
      status: 'PENDING',
      errorMessage: null,
      updatedAt: new Date(),
    })
    .where(eq(hostedBooks.id, id));
  console.log('Queued PENDING, processing…');
  await processBook(id);
  const [row] = await db
    .select({
      status: hostedBooks.status,
      errorMessage: hostedBooks.errorMessage,
    })
    .from(hostedBooks)
    .where(eq(hostedBooks.id, id))
    .limit(1);
  console.log('Result:', row);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
