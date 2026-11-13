import { appRedirect } from '@/lib/serverRedirect';

/** Authoring lives on the tool path; preserve query (e.g. refineRevision). */
export default async function CourseHubAuthoringRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { courseId } = await params;
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === 'string') qs.set(key, value);
    else if (Array.isArray(value) && value[0]) qs.set(key, value[0]);
  }
  const suffix = qs.size > 0 ? `?${qs.toString()}` : '';
  appRedirect(`/dashboard/professor/authoring/${courseId}${suffix}`);
}
