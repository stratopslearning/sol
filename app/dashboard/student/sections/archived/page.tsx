import Link from "next/link";
import { eq } from "drizzle-orm";
import { Archive } from "lucide-react";

import { db } from "@/app/db";
import { studentSections } from "@/app/db/schema";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionHeading } from "@/components/layout/SectionHeading";
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
import { requireStudent } from "@/lib/auth";
import { partitionEnrollmentsByConclusion } from "@/lib/sectionAvailability";
import { formatDateTimeStable } from "@/lib/utils";

export default async function StudentArchivedSectionsPage() {
  const user = await requireStudent();

  const enrollments = await db.query.studentSections.findMany({
    where: eq(studentSections.studentId, user.id),
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
      role="student"
      user={user}
      topbarEyebrow="Learner"
      topbarTitle="Past sections"
    >
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: withBasePath("/dashboard/student") },
          {
            label: "My sections",
            href: withBasePath("/dashboard/student/sections"),
          },
          { label: "Past sections" },
        ]}
        eyebrow="Archive"
        title="Past sections."
        description="Sections that have ended. You can still review grades and prior attempts — new quizzes and discussions are closed."
        actions={
          <Button asChild variant="outline">
            <Link href={appPath("/dashboard/student/sections")}>
              Back to active sections
            </Link>
          </Button>
        }
      />

      <section className="mt-10">
        <SectionHeading
          eyebrow="Concluded"
          title="Archived enrollments"
          description="Canvas-style past course list — read-only for new work."
        />

        <div className="mt-6">
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
                    <TableHead className="text-right">Grades</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((section) => (
                    <TableRow key={section.id}>
                      <TableCell className="font-medium">
                        {section.name}
                      </TableCell>
                      <TableCell className="text-ink-muted">
                        {section.course?.title ?? "—"}
                      </TableCell>
                      <TableCell className="text-ink-muted">
                        {section.endsAt
                          ? formatDateTimeStable(section.endsAt)
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">Archived</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link
                            href={appPath(
                              `/dashboard/student/grades?sectionId=${section.id}`,
                            )}
                          >
                            View grades
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
