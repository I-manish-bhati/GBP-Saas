import "server-only";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifySession } from "@/lib/auth/jwt";
import { getSessionToken } from "@/lib/auth/cookies";

export interface OwnerContext {
  ownerId: string;
  emailVerified: boolean;
}

function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function forbidden(error: string, code: string): NextResponse {
  return NextResponse.json({ error, code }, { status: 403 });
}

/**
 * For owner API route handlers. proxy.ts already verified the JWT shape at
 * the edge; this re-verifies and adds the DB-level checks proxy cannot do:
 * account still exists, not suspended (FR-41), and optionally email
 * verified (FR-4 — pass { requireVerified: true } for GBP connect, AI
 * actions, and billing routes).
 */
export async function requireOwner(
  opts?: { requireVerified?: boolean }
): Promise<OwnerContext | NextResponse> {
  const token = await getSessionToken("owner");
  if (!token) return unauthorized();

  const claims = await verifySession(token, "owner");
  if (!claims) return unauthorized();

  const { data, error } = await db
    .from("owners")
    .select("id, email_verified, suspended_at")
    .eq("id", claims.sub)
    .limit(1);

  if (error || !data || data.length === 0) return unauthorized();

  const owner = data[0];
  if (owner.suspended_at) {
    return forbidden("This account has been suspended. Please contact support.", "SUSPENDED");
  }
  if (opts?.requireVerified && !owner.email_verified) {
    return forbidden(
      "Please verify your email address to use this feature.",
      "EMAIL_NOT_VERIFIED"
    );
  }

  return { ownerId: owner.id, emailVerified: owner.email_verified };
}

export function isAuthResponse(
  value: OwnerContext | NextResponse
): value is NextResponse {
  return value instanceof NextResponse;
}

export interface AdminContext {
  adminId: string;
}

/**
 * For /admin/api/** route handlers. proxy.ts checked the admin_session JWT
 * shape at the edge; this re-verifies and adds the DB checks: admin still
 * exists and is still active (a disabled admin must die mid-session, FR-38).
 */
export async function requireAdmin(): Promise<AdminContext | NextResponse> {
  const token = await getSessionToken("admin");
  if (!token) return unauthorized();

  const claims = await verifySession(token, "admin");
  if (!claims) return unauthorized();

  const { data, error } = await db
    .from("admins")
    .select("id, is_active")
    .eq("id", claims.sub)
    .limit(1);

  if (error || !data || data.length === 0 || !data[0].is_active) {
    return unauthorized();
  }

  return { adminId: data[0].id };
}
