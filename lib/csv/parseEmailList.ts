/** Parse a CSV/text blob into normalized email addresses (first column or plain lines). */
export function parseEmailListFromCsv(raw: string, max = 500): string[] {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const emails: string[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    if (/^email/i.test(line) && emails.length === 0) continue;
    const cell = line.split(/[,;\t]/)[0]?.trim().replace(/^"|"$/g, '') ?? '';
    const email = cell.toLowerCase();
    if (!email.includes('@')) continue;
    if (seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
    if (emails.length >= max) break;
  }

  return emails;
}
