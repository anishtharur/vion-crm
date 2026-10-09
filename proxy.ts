import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/token";

/**
 * Optimistic auth gate: every matched request must carry a valid session
 * cookie, otherwise it is redirected to /login. This is only the first line of
 * defense — mutations and the PDF route re-check the session themselves.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await verifySessionToken(
    req.cookies.get(SESSION_COOKIE)?.value,
  );

  if (pathname === "/login") {
    // Already signed in — go straight to the dashboard.
    if (session) return NextResponse.redirect(new URL("/", req.nextUrl));
    return NextResponse.next();
  }

  if (!session) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  // Everything except Next's static output and public asset files.
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)",
  ],
};
