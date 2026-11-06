/**
 * Map Canvas / IMS LTI roles → SOL role hints.
 * Never demote ADMIN; callers must respect existing SOL role on sync.
 */

const INSTRUCTOR_FRAGMENTS = [
  'Instructor',
  'TeachingAssistant',
  'ContentDeveloper',
  'Administrator',
  'http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor',
  'http://purl.imsglobal.org/vocab/lis/v2/membership#TeachingAssistant',
  'http://purl.imsglobal.org/vocab/lis/v2/membership#ContentDeveloper',
  'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Administrator',
  'Faculty',
  'Teacher',
  'TaEnrollment',
  'TeacherEnrollment',
  'DesignerEnrollment',
];

const LEARNER_FRAGMENTS = [
  'Learner',
  'Student',
  'http://purl.imsglobal.org/vocab/lis/v2/membership#Learner',
  'StudentEnrollment',
];

export type LtiSolRoleHint = 'PROFESSOR' | 'STUDENT';

export function mapLtiRolesToSolHint(
  roles: string[] | undefined | null,
): LtiSolRoleHint {
  const list = roles ?? [];
  for (const role of list) {
    if (INSTRUCTOR_FRAGMENTS.some((f) => role.includes(f))) {
      return 'PROFESSOR';
    }
  }
  for (const role of list) {
    if (LEARNER_FRAGMENTS.some((f) => role.includes(f))) {
      return 'STUDENT';
    }
  }
  // Default to learner when Canvas sends ambiguous custom roles.
  return 'STUDENT';
}

export function isInstructorRoleHint(hint: LtiSolRoleHint): boolean {
  return hint === 'PROFESSOR';
}
