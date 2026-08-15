/**
 * Lightweight text sanitization before persisting user-authored strings.
 *
 * We do not render user HTML, so this is not an XSS sanitizer — it strips
 * null bytes / C0 controls (except newline and tab), NFC-normalizes, and
 * trims. Apply to quiz answers, chatbot messages, and similar stored text.
 */

const C0_EXCEPT_TAB_LF = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function sanitizeStoredText(value: string): string {
  if (!value) return value;
  return value.replace(C0_EXCEPT_TAB_LF, '').normalize('NFC').trim();
}

/** Map of answer-id → text; sanitizes each value. */
export function sanitizeAnswerRecord(
  answers: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(answers)) {
    out[key] = typeof val === 'string' ? sanitizeStoredText(val) : '';
  }
  return out;
}
