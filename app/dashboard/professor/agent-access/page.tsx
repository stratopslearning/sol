import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { getOrCreateUser } from "@/lib/getOrCreateUser";
import { withBasePath } from "@/lib/basePath";
import { listProfessorApiTokens } from "@/lib/professorApiTokens";

import AgentAccessClient from "./AgentAccessClient";

export const dynamic = "force-dynamic";

export default async function ProfessorAgentAccessPage() {
  const user = await getOrCreateUser();
  if (!user || (user.role !== "PROFESSOR" && user.role !== "ADMIN")) {
    return null;
  }

  let tokens: Awaited<ReturnType<typeof listProfessorApiTokens>> = [];
  try {
    tokens = await listProfessorApiTokens(user.id);
  } catch (error) {
    // Surface the real cause in server logs; keep the page usable so minting
    // still works if the list query fails (e.g. mid-migration).
    console.error("[agent-access] listProfessorApiTokens failed:", error);
  }

  // Prefer the public site URL already used elsewhere (layout, Stripe). Avoid
  // calling env() here — that helper is for boot-time validation in
  // instrumentation, not page renders.
  const origin = (
    process.env.NEXT_PUBLIC_BASE_URL || "https://www.strat-ops.net"
  ).replace(/\/$/, "");
  const mcpUrl = `${origin}${withBasePath("/api/mcp")}`;

  return (
    <AppShell
      role="professor"
      active="agent-access"
      topbarEyebrow="Faculty"
      topbarTitle="Agent access"
    >
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: withBasePath("/dashboard/professor") },
          { label: "Agent access" },
        ]}
        eyebrow="Automation"
        title="Connect your AI agent."
        description="Mint a personal access token, point your AI agent at the SOL MCP endpoint, and manage sections, quizzes, grading, and discussions by prompting."
      />
      <div className="mt-10">
        <AgentAccessClient
          mcpUrl={mcpUrl}
          initialTokens={tokens.map((t) => ({
            id: t.id,
            name: t.name,
            prefix: t.prefix,
            scopes: t.scopes,
            lastUsedAt: t.lastUsedAt ? t.lastUsedAt.toISOString() : null,
            expiresAt: t.expiresAt ? t.expiresAt.toISOString() : null,
            revokedAt: t.revokedAt ? t.revokedAt.toISOString() : null,
            createdAt: t.createdAt.toISOString(),
          }))}
        />
      </div>
    </AppShell>
  );
}
