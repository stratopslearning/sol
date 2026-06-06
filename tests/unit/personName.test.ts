import { describe, expect, it } from 'vitest';

import {
  comparePersonsByLastName,
  formatPersonName,
  personSortKey,
} from '@/lib/personName';

describe('formatPersonName', () => {
  it('formats first and last name', () => {
    expect(
      formatPersonName({ firstName: 'Daisy', lastName: 'Alvarez Rius' }),
    ).toBe('Daisy Alvarez Rius');
  });

  it('falls back to email', () => {
    expect(
      formatPersonName({ firstName: null, lastName: null, email: 'a@x.com' }),
    ).toBe('a@x.com');
  });
});

describe('comparePersonsByLastName', () => {
  it('sorts by last name then first name', () => {
    const people = [
      { firstName: 'Zoe', lastName: 'Smith' },
      { firstName: 'Amy', lastName: 'Adams' },
      { firstName: 'Bob', lastName: 'Smith' },
    ];
    people.sort(comparePersonsByLastName);
    expect(people.map((p) => p.lastName)).toEqual(['Adams', 'Smith', 'Smith']);
    expect(people[1]?.firstName).toBe('Bob');
  });
});

describe('personSortKey', () => {
  it('is stable for sorting', () => {
    expect(personSortKey({ firstName: 'A', lastName: 'B' })).toContain('b');
  });
});
