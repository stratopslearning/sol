const COMMON_CONSUMER_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'icloud.com',
  'me.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
  'gmx.com',
  'mail.com',
]);

/** True when the address looks like a school/work domain (not a consumer mailbox). */
export function looksLikeInstitutionalEmail(email: string | null | undefined): boolean {
  const normalized = email?.trim().toLowerCase();
  if (!normalized || !normalized.includes('@')) return false;
  const domain = normalized.split('@').pop() ?? '';
  if (!domain || COMMON_CONSUMER_DOMAINS.has(domain)) return false;
  if (domain.endsWith('.edu') || domain.endsWith('.ac.uk')) return true;
  if (domain.includes('.edu.') || domain.includes('.ac.')) return true;
  // Non-consumer custom domain — often departmental mail.
  return domain.includes('.');
}
