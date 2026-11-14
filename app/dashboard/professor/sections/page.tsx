import { appRedirect } from '@/lib/serverRedirect';

/** Sections are managed from each course hub. */
export default function ProfessorSectionsRedirect() {
  appRedirect('/dashboard/professor/courses');
}
