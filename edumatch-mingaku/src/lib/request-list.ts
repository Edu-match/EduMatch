const STORAGE_KEY = "edumatch-request-list";

export type RequestListItem = {
  id: string;
  title: string;
  thumbnail?: string;
  category?: string;
};

function getStored(): RequestListItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setStored(items: RequestListItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("edumatch-request-list-change"));
  } catch {}
}

export function getRequestList(): RequestListItem[] {
  return getStored();
}

export function addToRequestList(item: RequestListItem): void {
  const list = getStored();
  if (list.some((i) => i.id === item.id)) return;
  setStored([...list, item]);
}

export function removeFromRequestList(serviceId: string): void {
  setStored(getStored().filter((i) => i.id !== serviceId));
}

export function hasInRequestList(serviceId: string): boolean {
  return getStored().some((i) => i.id === serviceId);
}

export function toggleRequestList(item: RequestListItem): boolean {
  const list = getStored();
  const exists = list.some((i) => i.id === item.id);
  if (exists) {
    setStored(list.filter((i) => i.id !== item.id));
    return false;
  }
  setStored([...list, item]);
  return true;
}

export function getRequestListIds(): string[] {
  return getStored().map((i) => i.id);
}

/** リストをクリア（未ログイン時など） */
export function clearRequestList(): void {
  setStored([]);
}
