import { describe, expect, it } from 'vitest';

import { mapLtiRolesToSolHint } from '@/lib/lti/roles';

describe('mapLtiRolesToSolHint', () => {
  it('maps instructor URI to PROFESSOR', () => {
    expect(
      mapLtiRolesToSolHint([
        'http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor',
      ]),
    ).toBe('PROFESSOR');
  });

  it('maps teaching assistant to PROFESSOR', () => {
    expect(
      mapLtiRolesToSolHint([
        'http://purl.imsglobal.org/vocab/lis/v2/membership#TeachingAssistant',
      ]),
    ).toBe('PROFESSOR');
  });

  it('maps learner to STUDENT', () => {
    expect(
      mapLtiRolesToSolHint([
        'http://purl.imsglobal.org/vocab/lis/v2/membership#Learner',
      ]),
    ).toBe('STUDENT');
  });

  it('defaults ambiguous roles to STUDENT', () => {
    expect(mapLtiRolesToSolHint([])).toBe('STUDENT');
    expect(mapLtiRolesToSolHint(['urn:custom:observer'])).toBe('STUDENT');
  });
});
