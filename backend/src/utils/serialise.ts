import type { UserRow } from "../types/domain";

/** Removes anything that must never leave the server. */
export function publicUser(user: Omit<UserRow, "password_hash"> | UserRow) {
  return {
    id: Number(user.id),
    fullName: user.full_name,
    email: user.email,
    role: user.role,
    status: user.status,
    emailVerifiedAt: user.email_verified_at,
    createdAt: user.created_at,
  };
}
