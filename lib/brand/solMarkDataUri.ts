import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** White-on-transparent mark as a data URI for `next/og` ImageResponse. */
export async function solMarkPngDataUri(): Promise<string> {
  const bytes = await readFile(
    join(process.cwd(), "public/brand/sol-mark.png"),
  );
  return `data:image/png;base64,${bytes.toString("base64")}`;
}
