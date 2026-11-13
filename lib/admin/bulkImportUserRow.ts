/** Map CSV import intent to DB columns without writing legacy professor/admin roles. */
export function bulkImportDbValues(row: {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: 'STUDENT' | 'PROFESSOR' | 'ADMIN';
  paid: boolean;
}): {
  email: string;
  firstName: string | null;
  lastName: string | null;
  platformStaff: boolean;
  paid: boolean;
} {
  const { role: importLegacyRole } = row;
  return {
    email: row.email,
    firstName: row.firstName ?? null,
    lastName: row.lastName ?? null,
    platformStaff: importLegacyRole === 'ADMIN',
    paid: row.paid,
  };
}
