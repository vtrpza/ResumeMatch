const SESSION_KEY = "rgs_session_id";
const FREE_SCAN_KEY = "rgs_free_scan_used";
const PREMIUM_KEY = "rgs_premium";

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function shouldShowPaywall(): boolean {
  if (typeof window === "undefined") return false;
  const used = localStorage.getItem(FREE_SCAN_KEY);
  const premium = localStorage.getItem(PREMIUM_KEY);
  return used === "1" && premium !== "1";
}

export function setFreeScanUsed(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(FREE_SCAN_KEY, "1");
}

export function setPremium(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREMIUM_KEY, "1");
}
