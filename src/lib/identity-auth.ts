/**
 * Resolve verified identity from session cookie.
 * Used by API routes and server actions when RESUME_MATCH_FULL_APP is on.
 */

import { getIdentityBySessionToken } from "@/lib/db";
import type { Identity } from "@/lib/db";

export const IDENTITY_COOKIE_NAME = "rm_identity";

export async function getIdentityFromCookie(
  cookieToken: string | undefined
): Promise<Identity | null> {
  if (!cookieToken || typeof cookieToken !== "string") return null;
  return getIdentityBySessionToken(cookieToken);
}
