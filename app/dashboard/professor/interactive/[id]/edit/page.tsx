import { notFound } from "next/navigation";
import { requireTeachingAccess } from '@/lib/authz/gates';

import { InteractivePreviewClient } from "@/components/interactives/InteractivePreviewClient";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { withBasePath } from "@/lib/basePath";
import { getOrCreateUser } from "@/lib/getOrCreateUser";
import { assertCanManageInteractive } from "@/lib/interactives/access";
import { setInteractiveVisibility } from "@/lib/interactives/mutations";

export default async function EditInteractivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireTeachingAccess();
  const { id } = await params;
  let interactive;
  try {
    interactive = await assertCanManageInteractive(user, id);
  } catch {
    return notFound();
  }

  async function toggleRelease() {
    "use server";
    const me = await getOrCreateUser();
    if (!me) return;
    const current = await assertCanManageInteractive(me, id);
    await setInteractiveVisibility(me, id, !current.isActive);
  }

  return (
    <AppShell role="professor" user={user} topbarTitle="Interactive">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: withBasePath("/dashboard/professor") },
          {
            label: "Assignments",
            href: withBasePath("/dashboard/professor/assignments"),
          },
          { label: interactive.title },
        ]}
        eyebrow={interactive.kind}
        title={interactive.title}
        description={
          interactive.isActive
            ? "Released to students."
            : "Hidden until you release it."
        }
        actions={
          <form action={toggleRelease}>
            <Button type="submit" variant="outline">
              {interactive.isActive ? "Unrelease" : "Release"}
            </Button>
          </form>
        }
      />
      <div className="mt-10 max-w-3xl">
        <InteractivePreviewClient
          kind={interactive.kind}
          body={interactive.body ?? {}}
          title={interactive.title}
        />
      </div>
    </AppShell>
  );
}
