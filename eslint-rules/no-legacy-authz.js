/**
 * Flag authorization checks that use users.role or professorId equality.
 * Metadata writes (assigning professorId on insert) are not matched.
 */

const ROLE_COMPARE =
  /(user|authUser|viewer|actor)\.role\s*===?\s*['"`](STUDENT|PROFESSOR|ADMIN)['"`]|['"`](STUDENT|PROFESSOR|ADMIN)['"`]\s*===?\s*(user|authUser|viewer|actor)\.role|\.role\s*!==?\s*['"`](STUDENT|PROFESSOR|ADMIN)['"`]/;

const PROFESSOR_ID_COMPARE =
  /(professorId|quiz\.professorId|bot\.professorId|chatbot\.professorId|interactive\.professorId)\s*===?\s*(user|authUser)\.id|(user|authUser)\.id\s*===?\s*(professorId|.*\.professorId)/;

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow users.role / professorId authorization checks outside the allowlist.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowlist: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      legacyRole:
        'Legacy users.role authorization check. Use authorize() / bindings instead (or add path to eslint-legacy-authz-allowlist.json during Wave 2 cutover).',
      legacyProfessorId:
        'Legacy professorId ownership authorization check. Use authorize() / bindings instead (or allowlist during Wave 2 cutover).',
    },
  },
  create(context) {
    const options = context.options[0] ?? {};
    const allowlist = new Set(options.allowlist ?? []);
    const filename = context.filename.replace(/\\/g, '/');
    const rel = filename.includes('/Projects/sol-main/')
      ? filename.split('/Projects/sol-main/')[1]
      : filename;

    const allowed = [...allowlist].some(
      (entry) => rel === entry || rel.endsWith(entry) || rel.includes(entry),
    );
    if (allowed) return {};

    return {
      Literal(node) {
        // Handled via parent BinaryExpression for string roles.
      },
      BinaryExpression(node) {
        const text = context.sourceCode.getText(node);
        if (ROLE_COMPARE.test(text)) {
          context.report({ node, messageId: 'legacyRole' });
          return;
        }
        if (PROFESSOR_ID_COMPARE.test(text)) {
          context.report({ node, messageId: 'legacyProfessorId' });
        }
      },
    };
  },
};

export default rule;
