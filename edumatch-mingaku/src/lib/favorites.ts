const STORAGE_KEY = "edumatch-favorites";

export type FavoriteItem = {
  id: string;
  title: string;
  thumbnail?: string;
  category?: string;
  type: "article" | "service";
};

function getStored(): FavoriteItem[] {
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

function setStored(items: FavoriteItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("edumatch-favorites-change"));
  } catch {}
}

export function getFavorites(): FavoriteItem[] {
  return getStored();
}

export function addToFavorites(item: FavoriteItem): void {
  const list = getStored();
  if (list.some((i) => i.id === item.id && i.type === item.type)) return;
  setStored([...list, item]);
}

export function removeFromFavorites(itemId: string, type: "article" | "service"): void {
  setStored(getStored().filter((i) => !(i.id === itemId && i.type === type)));
}

export function hasInFavorites(itemId: string, type: "article" | "service"): boolean {
  return getStored().some((i) => i.id === itemId && i.type === type);
}

export function toggleFavorites(item: FavoriteItem): boolean {
  const list = getStored();
  const exists = list.some((i) => i.id === item.id && i.type === item.type);
  if (exists) {
    setStored(list.filter((i) => !(i.id === item.id && i.type === item.type)));
    return false;
  }
  setStored([...list, item]);
  return true;
}

export function getFavoriteIds(type?: "article" | "service"): string[] {
  const list = getStored();
  if (type) {
    return list.filter((i) => i.type === type).map((i) => i.id);
  }
  return list.map((i) => i.id);
}
