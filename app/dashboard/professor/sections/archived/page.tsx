import Link from "next/link";
import { eq } from "drizzle-orm";
import { Archive } from "lucide-react";

import { db } from "@/app/db";
import { professorSections } from "@/app/db/schema";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/patterns/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { appPath, withBasePath } from "@/lib/basePath";
import { getOrCreateUser } from "@/lib/getOrCreateUser";
import { partitionEnrollmentsByConclusion } from "@/lib/sectionAvailability";
import { formatDateTimeStable } from "@/lib/utils";

export default async function ProfessorArchivedSectionsPage() {
  const user = await getOrCreateUser();
  if (!user || user.role !== "PROFESSOR") return null;

  const enrollments = await db.query.professorSections.findMany({
    where: eq(professorSections.professorId, user.id),
    with: {
      section: { with: { course: true } },
    },
  });

  const { archived } = partitionEnrollmentsByConclusion(enrollments);
  const rows = archived
    .map((e) => e.section)
    .sort((a, b) => {
      const aEnd = a.endsAt ? new Date(a.endsAt).getTime() : 0;
      const bEnd = b.endsAt ? new Date(b.endsAt).getTime() : 0;
      return bEnd - aEnd;
    });

  return (
    <AppShell
      role="professor"
      active="sections"
      topbarEyebrow="Faculty"
      topbarTitle="Past sections"
    >
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: withBasePath("/dashboard/professor") },
          {
            label: "My sections",
            href: withBasePath("/dashboard/professor/sections"),
          },
          { label: "Past sections" },
        ]}
        eyebrow="Archive"
        title="Past sections."
        description="Concluded sections you taught. Open a section to review the gradebook or change the end date to reopen it."
        actions={
          <Button asChild variant="outline">
            <Link href={appPath("/dashboard/professor/sections")}>
              Back to ongoing sections
            </Link>
          </Button>
        }
      />

      <div className="mt-10">
        {rows.length === 0 ? (
          <EmptyState
            icon={<Archive className="h-5 w-5" />}
            eyebrow="Nothing here"
            title="No past sections yet."
            description="When a section end date passes, it moves here from My sections."
          />
        ) : (
          <div className="paper paper-shadow overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Section</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Ended</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((section) => (
                  <TableRow key={section.id}>
                    <TableCell className="font-medium">{section.name}</TableCell>
                    <TableCell className="text-ink-muted">
                      {section.course?.title ?? "—"}
                    </TableCell>
                    <TableCell className="text-ink-muted">
                      {section.endsAt
                        ? formatDateTimeStable(section.endsAt)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">Concluded</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link
                            href={appPath(
                              `/dashboard/professor/sections/${section.id}`,
                            )}
                          >
                            Open
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link
                            href={appPath(
                              `/dashboard/professor/sections/${section.id}/gradebook`,
                            )}
                          >
                            Gradebook
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
