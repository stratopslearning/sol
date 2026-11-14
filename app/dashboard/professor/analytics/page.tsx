import { appRedirect } from '@/lib/serverRedirect';

/** Analytics lives under the course hub. */
export default function ProfessorAnalyticsRedirect() {
  appRedirect('/dashboard/professor/courses');
}
