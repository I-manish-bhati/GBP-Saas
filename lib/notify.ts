import "server-only";
import { db } from "@/lib/db";
import { sendNotificationEmail } from "@/lib/email";

// Types mirror the notifications_type_check constraint (0001_init.sql).
export type NotificationType =
  | "post_ready"
  | "token_expired"
  | "payment_failed"
  | "post_failed";

/**
 * Settings > Notifications shape (0009_owner_prefs.sql). Stored jsonb is
 * treated as a partial object and merged with these defaults, so an absent
 * or legacy `{}` row behaves exactly like pre-0009: every bell on, no email.
 */
export interface NotificationPrefs {
  email: boolean;
  inApp: Record<NotificationType, boolean>;
}

const NOTIFICATION_TYPES: NotificationType[] = [
  "post_ready",
  "token_expired",
  "payment_failed",
  "post_failed",
];

const DEFAULT_PREFS: NotificationPrefs = {
  email: false,
  inApp: {
    post_ready: true,
    token_expired: true,
    payment_failed: true,
    post_failed: true,
  },
};

export function mergePrefs(raw: unknown): NotificationPrefs {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { email: false, inApp: { ...DEFAULT_PREFS.inApp } };
  }
  const obj = raw as Record<string, unknown>;
  const inApp = { ...DEFAULT_PREFS.inApp };
  const rawInApp =
    typeof obj.inApp === "object" && obj.inApp !== null && !Array.isArray(obj.inApp)
      ? (obj.inApp as Record<string, unknown>)
      : {};
  for (const t of NOTIFICATION_TYPES) {
    if (typeof rawInApp[t] === "boolean") inApp[t] = rawInApp[t];
  }
  return { email: obj.email === true, inApp };
}

export async function getNotificationPrefs(
  ownerId: string
): Promise<NotificationPrefs> {
  try {
    const { data } = await db
      .from("owners")
      .select("notification_prefs")
      .eq("id", ownerId)
      .limit(1);
    return mergePrefs(data?.[0]?.notification_prefs);
  } catch (e) {
    console.error("[notify] getNotificationPrefs threw:", e);
    return { email: false, inApp: { ...DEFAULT_PREFS.inApp } };
  }
}

/**
 * D2/M10: bell insert — silent, never throws; notification failure must not
 * break the caller's flow (FR-37 is best-effort). Honours the owner's
 * Settings > Notification preferences: a muted type skips the bell row, and
 * the optional email copy is only sent when the email master switch is on
 * AND that type is enabled in-app.
 */
export async function notify(
  ownerId: string,
  type: NotificationType,
  referenceId?: string
): Promise<void> {
  try {
    const prefs = await getNotificationPrefs(ownerId);
    const inAppOn = prefs.inApp[type] !== false;

    if (inAppOn) {
      const { error } = await db.from("notifications").insert({
        owner_id: ownerId,
        type,
        reference_id: referenceId ?? null,
      });
      if (error)
        console.error(`[notify] ${type} insert failed:`, error.message);
    }

    if (prefs.email && inAppOn) {
      const { data } = await db
        .from("owners")
        .select("email")
        .eq("id", ownerId)
        .limit(1);
      const email = data?.[0]?.email;
      if (email) await sendNotificationEmail(email, type);
    }
  } catch (e) {
    console.error("[notify] threw:", e);
  }
}
