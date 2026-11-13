import { appRedirect } from '@/lib/serverRedirect';

/** Archived sections remain reachable from course hubs; list entry redirects. */
export default function ProfessorArchivedSectionsRedirect() {
  appRedirect('/dashboard/professor/courses');
}
