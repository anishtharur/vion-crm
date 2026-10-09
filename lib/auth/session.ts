import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import {
  SESSION_COOKIE,
  signSessionToken,
  verifySessionToken,
  type SessionPayload,
} from "./token";

const SESSION_DAYS = 30;

// COOKIE_SECURE=0 is an escape hatch for serving production over plain HTTP
// (e.g. before HTTPS is set up) — secure cookies are never sent over http://.
function secureCookie(): boolean {
  return (
    process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "0"
  );
}

export async function createSession(user: {
  email: string;
  name: string;
}): Promise<void> {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const token = await signSessionToken({ email: user.email, name: user.name, exp });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: secureCookie(),
    sameSite: "lax",
    expires: new Date(exp),
    path: "/",
  });
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/** Current session, or null. Memoized per request render pass. */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
});

/** Like getSession, but redirects to /login when unauthenticated. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
