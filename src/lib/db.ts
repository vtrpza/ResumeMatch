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
