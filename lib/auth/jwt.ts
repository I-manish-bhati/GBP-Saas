import "server-only";
import { SignJWT, jwtVerify } from "jose";

export type SessionRole = "owner" | "customer" | "admin";

export interface SessionClaims {
  sub: string;
  role: SessionRole;
  iat: number;
  exp: number;
}

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const ADMIN_TTL_SECONDS = 60 * 60 * 12; // 12 hours

function secretFor(role: SessionRole): Uint8Array {
  const name = role === "admin" ? "ADMIN_JWT_SECRET" : "JWT_SECRET";
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} — copy .env.example to .env.local.`);
  return new TextEncoder().encode(value);
}

function ttlFor(role: SessionRole): number {
  return role === "admin" ? ADMIN_TTL_SECONDS : SESSION_TTL_SECONDS;
}

export async function signSession(sub: string, role: SessionRole): Promise<string> {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime(`${ttlFor(role)}s`)
    .sign(secretFor(role));
}

export async function verifySession(
  token: string,
  expectedRole: SessionRole
): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretFor(expectedRole), {
      algorithms: ["HS256"],
    });
    if (payload.role !== expectedRole || typeof payload.sub !== "string") return null;
    return payload as unknown as SessionClaims;
  } catch {
    return null;
  }
}
