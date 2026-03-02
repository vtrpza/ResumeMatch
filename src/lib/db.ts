import { neon } from "@neondatabase/serverless";

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

export interface Usage {
  scanCount: number;
  purchasedScans: number;
}

export async function getUsage(sessionId: string): Promise<Usage | null> {
  const sql = getSql();
  if (!sql) return null;

  try {
    const rows = await sql`
      select scan_count, purchased_scans
      from sessions
      where id = ${sessionId}
      limit 1
    `;
    const row = rows[0] as
      | { scan_count: number; purchased_scans: number }
      | undefined;
    if (!row) return { scanCount: 0, purchasedScans: 0 };

    return {
      scanCount: Number(row.scan_count) || 0,
      purchasedScans: Number(row.purchased_scans) || 0,
    };
  } catch {
    return null;
  }
}

export async function getOrCreateAndIncrementScan(
  sessionId: string
): Promise<{ scanCount: number }> {
  const sql = getSql();
  if (!sql) return { scanCount: 0 };

  try {
    await sql`
      insert into sessions (id, scan_count, purchased_scans)
      values (${sessionId}, 1, 0)
      on conflict (id) do update
      set scan_count = sessions.scan_count + 1
    `;
    const rows = await sql`
      select scan_count from sessions where id = ${sessionId} limit 1
    `;
    const row = rows[0] as { scan_count: number } | undefined;
    return { scanCount: row ? Number(row.scan_count) : 1 };
  } catch {
    return { scanCount: 0 };
  }
}

export async function setSubscriptionValidUntil(
  sessionId: string,
  validUntil: Date
): Promise<void> {
  const sql = getSql();
  if (!sql) return;

  try {
    await sql`
      insert into sessions (id, scan_count, subscription_valid_until)
      values (${sessionId}, 0, ${validUntil.toISOString()})
      on conflict (id) do update
      set subscription_valid_until = ${validUntil.toISOString()}
    `;
  } catch (e) {
    console.error("setSubscriptionValidUntil error:", e);
  }
}

export async function incrementPurchasedScans(
  sessionId: string
): Promise<void> {
  const sql = getSql();
  if (!sql) return;

  try {
    await sql`
      insert into sessions (id, scan_count, purchased_scans)
      values (${sessionId}, 0, 1)
      on conflict (id) do update
      set purchased_scans = sessions.purchased_scans + 1
    `;
  } catch (e) {
    console.error("incrementPurchasedScans error:", e);
  }
}

/**
 * Credit one purchased scan for this Stripe checkout session, only once per stripe_session_id.
 * Safe to call from both redirect confirm and webhook.
 */
export async function creditPurchaseIfNew(
  stripeSessionId: string,
  appSessionId: string
): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;

  try {
    const inserted = await sql`
      insert into processed_checkouts (stripe_session_id)
      values (${stripeSessionId})
      on conflict (stripe_session_id) do nothing
      returning stripe_session_id
    `;
    if (inserted.length > 0) {
      await incrementPurchasedScans(appSessionId);
      return true;
    }
    return false;
  } catch (e) {
    console.error("creditPurchaseIfNew error:", e);
    return false;
  }
}

// --- Identity (verified email) for one free scan per person ---

export interface Identity {
  id: string;
  email: string;
  emailVerifiedAt: Date | null;
  scanCount: number;
  purchasedScans: number;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function getOrCreateIdentity(email: string): Promise<Identity | null> {
  const sql = getSql();
  if (!sql) return null;
  const normalized = normalizeEmail(email);

  try {
    const rows = await sql`
      insert into identities (email)
      values (${normalized})
      on conflict (email) do update set email = identities.email
      returning id, email, email_verified_at, scan_count, purchased_scans
    `;
    const row = rows[0] as {
      id: string;
      email: string;
      email_verified_at: string | null;
      scan_count: number;
      purchased_scans: number;
    } | undefined;
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      emailVerifiedAt: row.email_verified_at ? new Date(row.email_verified_at) : null,
      scanCount: Number(row.scan_count) || 0,
      purchasedScans: Number(row.purchased_scans) || 0,
    };
  } catch (e) {
    console.error("getOrCreateIdentity error:", e);
    return null;
  }
}

export async function getIdentityBySessionToken(
  token: string
): Promise<Identity | null> {
  const sql = getSql();
  if (!sql) return null;

  try {
    const rows = await sql`
      select i.id, i.email, i.email_verified_at, i.scan_count, i.purchased_scans
      from identity_sessions s
      join identities i on i.id = s.identity_id
      where s.token = ${token} and s.expires_at > now()
      limit 1
    `;
    const row = rows[0] as {
      id: string;
      email: string;
      email_verified_at: string | null;
      scan_count: number;
      purchased_scans: number;
    } | undefined;
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      emailVerifiedAt: row.email_verified_at ? new Date(row.email_verified_at) : null,
      scanCount: Number(row.scan_count) || 0,
      purchasedScans: Number(row.purchased_scans) || 0,
    };
  } catch {
    return null;
  }
}

export async function getUsageForIdentity(identityId: string): Promise<Usage | null> {
  const sql = getSql();
  if (!sql) return null;

  try {
    const rows = await sql`
      select scan_count, purchased_scans from identities where id = ${identityId} limit 1
    `;
    const row = rows[0] as { scan_count: number; purchased_scans: number } | undefined;
    if (!row) return null;
    return {
      scanCount: Number(row.scan_count) || 0,
      purchasedScans: Number(row.purchased_scans) || 0,
    };
  } catch {
    return null;
  }
}

export async function incrementScanForIdentity(
  identityId: string
): Promise<{ scanCount: number }> {
  const sql = getSql();
  if (!sql) return { scanCount: 0 };

  try {
    await sql`
      update identities set scan_count = scan_count + 1 where id = ${identityId}
    `;
    const rows = await sql`
      select scan_count from identities where id = ${identityId} limit 1
    `;
    const row = rows[0] as { scan_count: number } | undefined;
    return { scanCount: row ? Number(row.scan_count) : 1 };
  } catch (e) {
    console.error("incrementScanForIdentity error:", e);
    return { scanCount: 0 };
  }
}

export async function incrementPurchasedScansForIdentity(
  identityId: string
): Promise<void> {
  const sql = getSql();
  if (!sql) return;

  try {
    await sql`
      update identities set purchased_scans = purchased_scans + 1 where id = ${identityId}
    `;
  } catch (e) {
    console.error("incrementPurchasedScansForIdentity error:", e);
  }
}

const VERIFICATION_TOKEN_TTL_HOURS = 24;

export async function createVerificationToken(
  identityId: string
): Promise<string | null> {
  const sql = getSql();
  if (!sql) return null;
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000);

  try {
    await sql`
      insert into verification_tokens (token, identity_id, expires_at)
      values (${token}, ${identityId}, ${expiresAt.toISOString()})
    `;
    return token;
  } catch (e) {
    console.error("createVerificationToken error:", e);
    return null;
  }
}

export async function consumeVerificationToken(
  token: string
): Promise<string | null> {
  const sql = getSql();
  if (!sql) return null;

  try {
    const rows = await sql`
      delete from verification_tokens
      where token = ${token} and expires_at > now()
      returning identity_id
    `;
    const row = rows[0] as { identity_id: string } | undefined;
    if (!row) return null;
    await sql`
      update identities set email_verified_at = now() where id = ${row.identity_id}
    `;
    return row.identity_id;
  } catch (e) {
    console.error("consumeVerificationToken error:", e);
    return null;
  }
}

const IDENTITY_SESSION_TTL_DAYS = 365;

export async function createIdentitySession(identityId: string): Promise<string | null> {
  const sql = getSql();
  if (!sql) return null;
  const token = crypto.randomUUID();
  const expiresAt = new Date(
    Date.now() + IDENTITY_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000
  );

  try {
    await sql`
      insert into identity_sessions (token, identity_id, expires_at)
      values (${token}, ${identityId}, ${expiresAt.toISOString()})
    `;
    return token;
  } catch (e) {
    console.error("createIdentitySession error:", e);
    return null;
  }
}

/**
 * Credit one purchased scan for this Stripe checkout by identity_id.
 * Safe to call from both redirect confirm and webhook.
 */
export async function creditPurchaseForIdentityIfNew(
  stripeSessionId: string,
  identityId: string
): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;

  try {
    const inserted = await sql`
      insert into processed_checkouts (stripe_session_id)
      values (${stripeSessionId})
      on conflict (stripe_session_id) do nothing
      returning stripe_session_id
    `;
    if (inserted.length > 0) {
      await incrementPurchasedScansForIdentity(identityId);
      return true;
    }
    return false;
  } catch (e) {
    console.error("creditPurchaseForIdentityIfNew error:", e);
    return false;
  }
}
