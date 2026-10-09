import "server-only";

import { scrypt, timingSafeEqual } from "node:crypto";

/**
 * Users are configured via the AUTH_USERS env var — no user table or admin UI,
 * which is all a 2-person deployment needs. Format (comma-separated entries):
 *
 *   AUTH_USERS=email:Display Name:salt.hash,other@x.com:Other:salt.hash
 *
 * Generate the `salt.hash` value with: npm run auth:hash -- "the password"
 * (scrypt, base64url salt and key). Names may contain anything except `,`.
 */

export type AuthUser = { email: string; name: string; passwordHash: string };

// Valid-format hash verified for unknown emails so response timing doesn't
// reveal whether an account exists.
const DUMMY_HASH =
  "AAAAAAAAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

export function getUsers(): AuthUser[] {
  const raw = process.env.AUTH_USERS ?? "";
  const users: AuthUser[] = [];
  for (const entry of raw.split(",")) {
    const parts = entry.trim().split(":");
    if (parts.length < 3) continue;
    const email = parts[0].trim().toLowerCase();
    const passwordHash = parts[parts.length - 1].trim();
    const name = parts.slice(1, -1).join(":").trim();
    if (email && name && passwordHash) users.push({ email, name, passwordHash });
  }
  return users;
}

async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const [saltPart, hashPart] = storedHash.split(".");
  if (!saltPart || !hashPart) return false;
  const salt = Buffer.from(saltPart, "base64url");
  const expected = Buffer.from(hashPart, "base64url");
  if (salt.length === 0 || expected.length === 0) return false;
  const actual = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, expected.length, (err, key) =>
      err ? reject(err) : resolve(key),
    );
  });
  return timingSafeEqual(actual, expected);
}

/** Returns the matching user when email + password are valid, else null. */
export async function authenticate(
  email: string,
  password: string,
): Promise<AuthUser | null> {
  const user = getUsers().find((u) => u.email === email.trim().toLowerCase());
  if (!user) {
    await verifyPassword(password, DUMMY_HASH);
    return null;
  }
  return (await verifyPassword(password, user.passwordHash)) ? user : null;
}
