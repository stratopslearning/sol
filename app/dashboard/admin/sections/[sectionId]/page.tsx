import { notFound } from 'next/navigation';

import { SectionDetailView } from '@/components/sections/SectionDetailView';
import { SectionFormModal } from '@/components/admin/SectionFormModal';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { requireAdmin } from '@/lib/auth';
import { withBasePath } from '@/lib/basePath';
import { loadSectionDetailData } from '@/lib/sectionDetailData';

export default async function AdminSectionDetailPage({
  params,
}: {
  params: Promise<{ sectionId: string }>;
}) {
  await requireAdmin();
  const { sectionId } = await params;
  const data = await loadSectionDetailData(sectionId);
  if (!data) return notFound();

  return (
    <AppShell
      role="admin"
      active="sections"
      topbarEyebrow="Administration"
      topbarTitle={data.section.name}
    >
      <PageHeader
        breadcrumbs={[
          { label: 'Overview', href: withBasePath('/dashboard/admin') },
          {
            label: 'Sections',
            href: withBasePath('/dashboard/admin/sections'),
          },
          { label: data.section.name },
        ]}
        eyebrow="Section"
        title={data.section.name}
        description={
          data.section.course
            ? `${data.section.course.title}${
                data.section.course.description
                  ? ` · ${data.section.course.description}`
                  : ''
              }`
            : 'Section detail'
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <a
                href={withBasePath(
                  `/dashboard/admin/sections/${sectionId}/gradebook`,
                )}
              >
                Gradebook
              </a>
            </Button>
            <SectionFormModal
              mode="edit"
              section={{
                id: data.section.id,
                name: data.section.name,
                professorEnrollmentCode: data.section.professorEnrollmentCode,
                studentEnrollmentCode: data.section.studentEnrollmentCode,
              }}
            />
            <SectionFormModal
              mode="delete"
              section={{
                id: data.section.id,
                name: data.section.name,
                professorEnrollmentCode: data.section.professorEnrollmentCode,
                studentEnrollmentCode: data.section.studentEnrollmentCode,
              }}
            />
          </div>
        }
      />

      <SectionDetailView data={data} role="admin" sectionId={sectionId} />
    </AppShell>
  );
}
