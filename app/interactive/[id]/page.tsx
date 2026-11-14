import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db } from "@/app/db";
import { interactiveProgress } from "@/app/db/schema";
import { InteractiveTakeClient } from "@/components/interactives/InteractiveTakeClient";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireAuth } from "@/lib/auth";
import { withBasePath } from "@/lib/basePath";
import { assertStudentCanAccessInteractive } from "@/lib/interactives/access";

export default async function InteractiveTakePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const { id } = await params;

  let interactive;
  try {
    interactive = await assertStudentCanAccessInteractive(user, id);
  } catch {
    return notFound();
  }

  const progress = await db.query.interactiveProgress.findFirst({
    where: and(
      eq(interactiveProgress.interactiveId, id),
      eq(interactiveProgress.studentId, user.id),
    ),
  });

  return (
    <AppShell
      role="student"
      user={user}
      topbarTitle={interactive.title}
    >
      <PageHeader
        breadcrumbs={[
          {
            label: "Assignments",
            href: withBasePath("/dashboard/student/assignments"),
          },
          { label: interactive.title },
        ]}
        eyebrow={interactive.kind}
        title={interactive.title}
        description={interactive.description ?? undefined}
      />
      <div className="mt-10 max-w-3xl">
        <InteractiveTakeClient
          interactiveId={interactive.id}
          kind={interactive.kind}
          body={interactive.body ?? {}}
          title={interactive.title}
          initialCompleted={progress?.status === "COMPLETED"}
        />
      </div>
    </AppShell>
  );
}
