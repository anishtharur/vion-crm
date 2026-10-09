/**
 * Session-token signing and verification. Kept free of `server-only` and
 * `next/headers` so it can be imported from `proxy.ts` as well as Server
 * Components / Actions. Tokens are compact HMAC-SHA256-signed payloads:
 * `base64url(json).base64url(signature)` — no JWT library needed.
 */

export const SESSION_COOKIE = "vion_session";

export type SessionPayload = {
  email: string;
  name: string;
  /** Absolute expiry, ms since epoch. */
  exp: number;
};

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 16) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET must be set to a random string (16+ chars) in production. Generate one with: openssl rand -base64 32",
    );
  }
  return "vion-dev-only-insecure-secret";
}

async function hmac(data: string): Promise<Buffer> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Buffer.from(signature);
}

export async function signSessionToken(
  payload: SessionPayload,
): Promise<string> {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = (await hmac(body)).toString("base64url");
  return `${body}.${sig}`;
}

/** Returns the payload for a valid, unexpired token; null otherwise. */
export async function verifySessionToken(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = (await hmac(body)).toString("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  if (diff !== 0) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (
      typeof payload?.email !== "string" ||
      typeof payload?.name !== "string" ||
      typeof payload?.exp !== "number" ||
      payload.exp < Date.now()
    ) {
      return null;
    }
    return payload as SessionPayload;
  } catch {
    return null;
  }
}
