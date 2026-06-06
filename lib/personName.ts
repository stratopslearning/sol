export type PersonNameFields = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
};

/** Display as "First Last", falling back to firstName, lastName, or email. */
export function formatPersonName(person: PersonNameFields): string {
  const first = (person.firstName ?? '').trim();
  const last = (person.lastName ?? '').trim();
  if (first && last) return `${first} ${last}`;
  if (first) return first;
  if (last) return last;
  return (person.email ?? '').trim() || 'Unknown';
}

/** Sort key for last-name-primary ordering (lowercase). */
export function personSortKey(person: PersonNameFields): string {
  const last = (person.lastName ?? '').trim().toLowerCase();
  const first = (person.firstName ?? '').trim().toLowerCase();
  const email = (person.email ?? '').trim().toLowerCase();
  return `${last}\0${first}\0${email}`;
}

export function comparePersonsByLastName(
  a: PersonNameFields,
  b: PersonNameFields,
): number {
  return personSortKey(a).localeCompare(personSortKey(b));
}
