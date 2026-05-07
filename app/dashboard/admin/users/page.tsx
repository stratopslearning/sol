import { db } from "@/app/db";
import UserTableWithFilters from "@/components/admin/UserTableWithFilters";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireAdmin } from "@/lib/auth";
import { withBasePath } from "@/lib/basePath";

export default async function AdminUsersPage() {
  await requireAdmin();
  const allUsers = await db.query.users.findMany();

  return (
    <AppShell role="admin" active="users" topbarEyebrow="Administration" topbarTitle="People">
      <PageHeader
        breadcrumbs={[
          { label: "Overview", href: withBasePath("/dashboard/admin") },
          { label: "People" },
        ]}
        eyebrow="People"
        title="Members of the institution."
        description="Every account on the platform — change roles, manage access, audit enrolment status."
      />
      <div className="mt-10">
        <UserTableWithFilters users={allUsers} />
      </div>
    </AppShell>
  );
}
