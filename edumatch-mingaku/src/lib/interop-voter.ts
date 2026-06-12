const STORAGE_KEY = "interop_voter_key";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** 端末ごとの匿名識別子（いいねの重複防止用） */
export function getInteropVoterKey(): string {
  if (typeof window === "undefined") return "";
  try {
    let key = localStorage.getItem(STORAGE_KEY);
    if (!key || !isValidInteropVoterKey(key)) {
      key = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, key);
    }
    return key;
  } catch {
    return crypto.randomUUID();
  }
}

export function isValidInteropVoterKey(key: string): boolean {
  return UUID_RE.test(key);
}
