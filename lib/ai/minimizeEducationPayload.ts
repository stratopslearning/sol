/**
 * Minimize education-record text before it leaves the trust boundary to OpenAI.
 * Strips email-shaped strings; never inject profile fields (name, clerkId) into prompts.
 */
const EMAIL_RE =
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export function minimizeStudentTextForAi(text: string): string {
  if (!text) return text;
  return text.replace(EMAIL_RE, '[REDACTED_EMAIL]');
}

/** Assert we are not accidentally shipping common profile field labels into AI prompts. */
export function promptContainsProfilePii(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  const needles = [
    'clerkid',
    'clerk_id',
    'studentemail',
    'student_email',
    'stripecustomerid',
  ];
  return needles.some((n) => lower.includes(n));
}
