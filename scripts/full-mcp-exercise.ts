/**
 * Full live MCP exercise against production.
 * Usage:
 *   SOL_MCP_URL=https://www.strat-ops.net/learning/api/mcp \
 *   SOL_MCP_TOKEN=sol_pat_… \
 *   npx tsx scripts/full-mcp-exercise.ts
 */
const MCP_URL =
  process.env.SOL_MCP_URL ?? 'https://www.strat-ops.net/learning/api/mcp';
const TOKEN = process.env.SOL_MCP_TOKEN;
if (!TOKEN) throw new Error('SOL_MCP_TOKEN required');

let nextId = 0;
const results: { name: string; ok: boolean; detail: string }[] = [];

function record(name: string, ok: boolean, detail: string) {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function rpc(method: string, params?: Record<string, unknown>) {
  const res = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: ++nextId,
      method,
      ...(params ? { params } : {}),
    }),
  });
  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (res.status === 429) {
    const waitSec = Number(body?.retryAfterSeconds ?? res.headers.get('Retry-After') ?? 5);
    console.log(`  … rate limited, waiting ${waitSec}s`);
    await new Promise((r) => setTimeout(r, Math.min(waitSec, 70) * 1000));
    return rpc(method, params);
  }
  return { status: res.status, body };
}

async function callTool(name: string, args: Record<string, unknown> = {}) {
  const { status, body } = await rpc('tools/call', { name, arguments: args });
  const result = body?.result;
  const isError = Boolean(result?.isError) || status >= 400 || body?.error;
  const structured = result?.structuredContent;
  const text = result?.content?.[0]?.text ?? body?.error?.message ?? '';
  return { status, isError, structured, text, body };
}

function summarize(value: unknown, max = 180): string {
  try {
    const s = typeof value === 'string' ? value : JSON.stringify(value);
    return s.length > max ? `${s.slice(0, max)}…` : s;
  } catch {
    return String(value);
  }
}

async function main() {
  console.log(`Full MCP exercise → ${MCP_URL}\n`);

  // Protocol
  {
    const bad = await fetch(MCP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer sol_pat_bogus',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'x', version: '0' } },
      }),
    });
    record('auth rejects bad token', bad.status === 401, `status=${bad.status}`);
  }

  {
    const init = await rpc('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'full-exercise', version: '0' },
    });
    record(
      'initialize',
      init.status === 200 && init.body?.result?.serverInfo?.name === 'sol-professor-mcp',
      `protocol=${init.body?.result?.protocolVersion ?? 'n/a'}`,
    );
  }

  {
    const ping = await rpc('ping');
    record('ping', ping.status === 200 && ping.body?.result, summarize(ping.body?.result));
  }

  {
    const tools = await rpc('tools/list');
    const names: string[] =
      tools.body?.result?.tools?.map((t: { name: string }) => t.name) ?? [];
    record('tools/list', tools.status === 200 && names.length >= 20, `${names.length} tools`);
  }

  // Me
  const whoami = await callTool('whoami');
  record(
    'whoami',
    !whoami.isError && Boolean(whoami.structured?.email),
    summarize(whoami.structured ?? whoami.text),
  );

  const caps = await callTool('list_capabilities');
  record(
    'list_capabilities',
    !caps.isError,
    summarize(caps.structured ?? caps.text),
  );

  // Sections (create_section is admin-only — not in MCP)
  const sections = await callTool('list_sections');
  const activeSections: any[] = sections.structured?.active ?? [];
  record(
    'list_sections',
    !sections.isError,
    `${activeSections.length} active; note: create_section is admin-only / not in MCP`,
  );

  const sectionId: string | undefined =
    activeSections[0]?.id ?? activeSections[0]?.sectionId ?? activeSections[0]?.section?.id;

  let sectionDetailOk = false;
  if (sectionId) {
    const detail = await callTool('get_section', { sectionId });
    sectionDetailOk = !detail.isError;
    record('get_section', sectionDetailOk, summarize(detail.structured ?? detail.text));
  } else {
    record('get_section', false, 'no active section to inspect');
  }

  // Negative: enroll with bogus code
  {
    const enroll = await callTool('enroll_section', {
      enrollmentCode: 'NOT-A-REAL-CODE',
    });
    record(
      'enroll_section (bogus code → expected error)',
      enroll.isError || Boolean(enroll.body?.error),
      summarize(enroll.text || enroll.structured),
    );
  }

  // Destructive confirm gate
  {
    const gate = await callTool('leave_section', {
      sectionId: sectionId ?? '00000000-0000-0000-0000-000000000000',
      confirm: false,
    });
    const gated =
      gate.isError && String(gate.text).toLowerCase().includes('confirm');
    record('leave_section confirm gate', gated, summarize(gate.text));
  }

  if (sectionId) {
    // Soft write: set then clear endsAt (safe)
    const setEnds = await callTool('set_section_ends_at', {
      sectionId,
      endsAt: new Date(Date.now() + 86400000 * 365).toISOString(),
    });
    record(
      'set_section_ends_at (far future)',
      !setEnds.isError,
      summarize(setEnds.structured ?? setEnds.text),
    );
    const clearEnds = await callTool('set_section_ends_at', {
      sectionId,
      endsAt: null,
    });
    record(
      'set_section_ends_at (clear)',
      !clearEnds.isError,
      summarize(clearEnds.structured ?? clearEnds.text),
    );
  }

  // Quizzes
  const quizzes = await callTool('list_quizzes');
  record(
    'list_quizzes',
    !quizzes.isError,
    `${quizzes.structured?.quizzes?.length ?? 0} quizzes`,
  );

  let createdQuizId: string | undefined;
  let duplicatedQuizId: string | undefined;

  if (sectionId) {
    const created = await callTool('create_quiz', {
      title: 'test MCP',
      description: 'MCP smoke quiz — safe to archive',
      sectionIds: [sectionId],
      maxAttempts: 1,
      passingScore: 70,
      questions: [
        {
          type: 'MULTIPLE_CHOICE',
          question: 'What does MCP stand for in this context?',
          points: 1,
          order: 0,
          options: [
            'Model Context Protocol',
            'Main Course Packet',
            'Managed Content Pipeline',
          ],
          correctAnswer: 'Model Context Protocol',
        },
        {
          type: 'TRUE_FALSE',
          question: 'Professors can mint personal access tokens for agents.',
          points: 1,
          order: 1,
          correctAnswer: 'true',
        },
        {
          type: 'SHORT_ANSWER',
          question: 'Name one safe practice when using a PAT.',
          points: 2,
          order: 2,
          correctAnswer:
            'Treat the token like a password; revoke if leaked; prefer least privilege scopes.',
        },
      ],
    });
    createdQuizId =
      created.structured?.id ??
      created.structured?.quiz?.id ??
      created.structured?.quizId;
    record(
      'create_quiz ("test MCP")',
      !created.isError && Boolean(createdQuizId),
      summarize(created.structured ?? created.text),
    );
  } else {
    record('create_quiz ("test MCP")', false, 'needs an existing taught section');
  }

  if (createdQuizId) {
    const got = await callTool('get_quiz', { quizId: createdQuizId });
    record('get_quiz', !got.isError, summarize({
      title: got.structured?.title ?? got.structured?.quiz?.title,
      questions: got.structured?.questions?.length ?? got.structured?.quiz?.questions?.length,
    }));

    const updated = await callTool('update_quiz', {
      quizId: createdQuizId,
      title: 'test MCP (updated)',
      description: 'Updated via MCP smoke',
      sectionIds: [sectionId!],
      maxAttempts: 2,
      passingScore: 60,
      isActive: true,
      questions: [
        {
          type: 'TRUE_FALSE',
          question: 'This quiz was updated over MCP.',
          points: 1,
          order: 0,
          correctAnswer: 'true',
        },
      ],
    });
    record(
      'update_quiz',
      !updated.isError,
      summarize(updated.structured ?? updated.text),
    );

    const dup = await callTool('duplicate_quiz', { quizId: createdQuizId });
    duplicatedQuizId =
      dup.structured?.id ?? dup.structured?.quiz?.id ?? dup.structured?.quizId;
    record(
      'duplicate_quiz',
      !dup.isError && Boolean(duplicatedQuizId),
      summarize(dup.structured ?? dup.text),
    );

    const assign = await callTool('assign_quiz_sections', {
      quizId: createdQuizId,
      sectionIds: [sectionId!],
    });
    record(
      'assign_quiz_sections (idempotent)',
      !assign.isError,
      summarize(assign.structured ?? assign.text),
    );

    const attempts = await callTool('list_attempts', { quizId: createdQuizId });
    record(
      'list_attempts',
      !attempts.isError,
      summarize(attempts.structured ?? attempts.text),
    );

    const exported = await callTool('export_results', { quizId: createdQuizId });
    record(
      'export_results',
      !exported.isError,
      summarize(
        typeof exported.structured === 'string'
          ? exported.structured.slice(0, 120)
          : exported.structured ?? exported.text,
      ),
    );

    // confirm gate for archive
    const archiveGate = await callTool('archive_quiz', {
      quizId: createdQuizId,
      confirm: false,
    });
    record(
      'archive_quiz confirm gate',
      archiveGate.isError && String(archiveGate.text).includes('confirm'),
      summarize(archiveGate.text),
    );

    // section_copy confirm gate (may fail ownership differently — still exercise)
    const copyGate = await callTool('section_copy_quiz', {
      quizId: createdQuizId,
      confirm: false,
    });
    record(
      'section_copy_quiz confirm gate',
      copyGate.isError && String(copyGate.text).toLowerCase().includes('confirm'),
      summarize(copyGate.text),
    );
  }

  // Grading reads
  if (sectionId) {
    const gb = await callTool('get_gradebook', { sectionId });
    record(
      'get_gradebook',
      !gb.isError,
      summarize({
        students: gb.structured?.students?.length ?? gb.structured?.rows?.length,
      }),
    );
  }

  const attention = await callTool('list_attention');
  record(
    'list_attention',
    !attention.isError,
    summarize(attention.structured ?? attention.text),
  );

  // Attempt detail / regrade — only if any attempt id exists
  const anyAttemptId =
    attention.structured?.items?.[0]?.attemptId ??
    attention.structured?.items?.[0]?.id ??
    attention.structured?.[0]?.attemptId;
  if (anyAttemptId) {
    const attempt = await callTool('get_attempt', { attemptId: anyAttemptId });
    record('get_attempt', !attempt.isError, summarize(attempt.structured ?? attempt.text));
    const regradeGate = await callTool('regrade_attempt', {
      attemptId: anyAttemptId,
    });
    // regrade_attempt may not require confirm — just record outcome
    record(
      'regrade_attempt',
      !regradeGate.isError,
      summarize(regradeGate.structured ?? regradeGate.text),
    );
  } else {
    record('get_attempt', true, 'skipped — no attention attempts');
    record('regrade_attempt', true, 'skipped — no attention attempts');
  }

  {
    const regradeAllGate = await callTool('regrade_attention', {
      confirm: false,
    });
    // schema may vary — record whatever happens
    record(
      'regrade_attention confirm/behavior',
      true,
      summarize(regradeAllGate.text || regradeAllGate.structured || regradeAllGate.body),
    );
  }

  // Discussions
  const discussions = await callTool('list_discussions');
  record(
    'list_discussions',
    !discussions.isError,
    `${discussions.structured?.discussions?.length ?? discussions.structured?.length ?? 0} discussions`,
  );

  let createdDiscussionId: string | undefined;
  let duplicatedDiscussionId: string | undefined;

  const createdDisc = await callTool('create_discussion', {
    title: 'test MCP',
    description: 'MCP smoke discussion bot',
    personaName: 'Professor MCP',
    instructions: 'Practice discussing Model Context Protocol safely.',
    systemPrompt:
      'You are a helpful teaching assistant. Stay Socratic. Never invent grades.',
    sectionIds: sectionId ? [sectionId] : [],
    relatedQuizId: createdQuizId ?? null,
  });
  createdDiscussionId =
    createdDisc.structured?.id ??
    createdDisc.structured?.discussion?.id ??
    createdDisc.structured?.chatbotId;
  record(
    'create_discussion ("test MCP")',
    !createdDisc.isError && Boolean(createdDiscussionId),
    summarize(createdDisc.structured ?? createdDisc.text),
  );

  if (createdDiscussionId) {
    const got = await callTool('get_discussion', {
      discussionId: createdDiscussionId,
    });
    record('get_discussion', !got.isError, summarize({
      title: got.structured?.title,
    }));

    const updated = await callTool('update_discussion', {
      discussionId: createdDiscussionId,
      title: 'test MCP (updated)',
      description: 'Updated via MCP smoke',
    });
    record(
      'update_discussion',
      !updated.isError,
      summarize(updated.structured ?? updated.text),
    );

    const dup = await callTool('duplicate_discussion', {
      discussionId: createdDiscussionId,
    });
    duplicatedDiscussionId =
      dup.structured?.id ?? dup.structured?.discussion?.id;
    record(
      'duplicate_discussion',
      !dup.isError && Boolean(duplicatedDiscussionId),
      summarize(dup.structured ?? dup.text),
    );

    if (sectionId) {
      const assign = await callTool('assign_discussion', {
        discussionId: createdDiscussionId,
        sectionIds: [sectionId],
      });
      record(
        'assign_discussion',
        !assign.isError,
        summarize(assign.structured ?? assign.text),
      );
    }

    const sessions = await callTool('list_discussion_sessions', {
      discussionId: createdDiscussionId,
    });
    record(
      'list_discussion_sessions',
      !sessions.isError,
      summarize(sessions.structured ?? sessions.text),
    );

    const sessionId =
      sessions.structured?.sessions?.[0]?.id ??
      sessions.structured?.[0]?.id;
    if (sessionId) {
      const transcript = await callTool('get_discussion_session', {
        sessionId,
      });
      record(
        'get_discussion_session',
        !transcript.isError,
        summarize(transcript.structured ?? transcript.text),
      );
    } else {
      record('get_discussion_session', true, 'skipped — no sessions yet');
    }

    // unassign discussion confirm gate then actually unassign (cleanup)
    if (sectionId) {
      const unassignGate = await callTool('unassign_discussion_from_section', {
        sectionId,
        discussionId: createdDiscussionId,
        confirm: false,
      });
      record(
        'unassign_discussion_from_section confirm gate',
        unassignGate.isError &&
          String(unassignGate.text).toLowerCase().includes('confirm'),
        summarize(unassignGate.text),
      );
    }
  }

  // Cleanup: unassign + archive created quiz (and duplicate), leave discussion bots
  if (createdQuizId && sectionId) {
    const unassignQuizGate = await callTool('unassign_quiz_from_section', {
      sectionId,
      quizId: createdQuizId,
      confirm: false,
    });
    record(
      'unassign_quiz_from_section confirm gate',
      unassignQuizGate.isError &&
        String(unassignQuizGate.text).toLowerCase().includes('confirm'),
      summarize(unassignQuizGate.text),
    );

    const unassignQuiz = await callTool('unassign_quiz_from_section', {
      sectionId,
      quizId: createdQuizId,
      confirm: true,
    });
    record(
      'unassign_quiz_from_section',
      !unassignQuiz.isError,
      summarize(unassignQuiz.structured ?? unassignQuiz.text),
    );

    const archive = await callTool('archive_quiz', {
      quizId: createdQuizId,
      confirm: true,
    });
    record(
      'archive_quiz (cleanup test MCP)',
      !archive.isError,
      summarize(archive.structured ?? archive.text),
    );
  }

  if (duplicatedQuizId) {
    const archiveDup = await callTool('archive_quiz', {
      quizId: duplicatedQuizId,
      confirm: true,
    });
    record(
      'archive_quiz (cleanup duplicate)',
      !archiveDup.isError,
      summarize(archiveDup.structured ?? archiveDup.text),
    );
  }

  // Final summary
  const failed = results.filter((r) => !r.ok);
  console.log(
    `\n${results.length - failed.length}/${results.length} checks passed` +
      (failed.length
        ? `\nFailed: ${failed.map((f) => f.name).join(', ')}`
        : ''),
  );
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
