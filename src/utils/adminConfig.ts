// Keep this list in sync with MASTER_ADMIN_EMAILS in server.ts.
// These are marketplace-wide super-admin accounts that bypass the
// per-user `role` column check.
export const MASTER_ADMIN_EMAILS = [
  "adminnaijastoresonline@gmail.com",
  "mcgigimeshai@gmail.com",
];

export function isMasterAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return MASTER_ADMIN_EMAILS.includes(email.toLowerCase());
}
