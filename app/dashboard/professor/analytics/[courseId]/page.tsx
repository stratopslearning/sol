import { appRedirect } from '@/lib/serverRedirect';

/** Prefer course hub analytics tab. */
export default async function ProfessorCourseAnalyticsRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ sectionId?: string }>;
}) {
  const { courseId } = await params;
  const { sectionId } = await searchParams;
  const q = sectionId ? `?sectionId=${encodeURIComponent(sectionId)}` : '';
  appRedirect(`/dashboard/professor/courses/${courseId}/analytics${q}`);
}
