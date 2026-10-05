import "server-only";
import { cookies } from "next/headers";
import type { SessionRole } from "./jwt";

// Separate cookie per identity so an owner token can never be mistaken
// for a customer/admin token (FR-43, M9 note).
export const SESSION_COOKIES = {
  owner: "owner_session",
  customer: "customer_session",
  admin: "admin_session",
} as const;

export type SessionKind = keyof typeof SESSION_COOKIES;
export type CookieRole = Extract<SessionRole, SessionKind>;

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function baseOptions() {
  return {
    httpOnly: true,
    // Safari/WebKit refuses Secure cookies on plain http:// (Chrome allows
    // them on localhost) — gate on production so local Safari runs work.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  };
}

export async function getSessionToken(kind: SessionKind): Promise<string | undefined> {
  const store = await cookies();
  return store.get(SESSION_COOKIES[kind])?.value;
}

export async function setSessionToken(kind: SessionKind, token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIES[kind], token, baseOptions());
}

export async function clearSessionToken(kind: SessionKind): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIES[kind], "", { ...baseOptions(), maxAge: 0 });
}
