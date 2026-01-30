"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { RequestListItem } from "@/lib/request-list";
import {
  getRequestList,
  addToRequestList as addStored,
  removeFromRequestList as removeStored,
  hasInRequestList as hasStored,
  toggleRequestList as toggleStored,
} from "@/lib/request-list";

type RequestListContextValue = {
  items: RequestListItem[];
  count: number;
  has: (serviceId: string) => boolean;
  add: (item: RequestListItem) => void;
  remove: (serviceId: string) => void;
  toggle: (item: RequestListItem) => boolean;
};

const RequestListContext = createContext<RequestListContextValue | null>(null);

export function RequestListProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<RequestListItem[]>([]);

  const refresh = useCallback(() => {
    setItems(getRequestList());
  }, []);

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener("edumatch-request-list-change", handler);
    return () => window.removeEventListener("edumatch-request-list-change", handler);
  }, [refresh]);

  const add = useCallback((item: RequestListItem) => {
    addStored(item);
    setItems(getRequestList());
  }, []);

  const remove = useCallback((serviceId: string) => {
    removeStored(serviceId);
    setItems(getRequestList());
  }, []);

  const toggle = useCallback((item: RequestListItem) => {
    const added = toggleStored(item);
    setItems(getRequestList());
    return added;
  }, []);

  const has = useCallback(
    (serviceId: string) => items.some((i) => i.id === serviceId),
    [items]
  );

  const value: RequestListContextValue = {
    items,
    count: items.length,
    has,
    add,
    remove,
    toggle,
  };

  return (
    <RequestListContext.Provider value={value}>
      {children}
    </RequestListContext.Provider>
  );
}

export function useRequestList() {
  const ctx = useContext(RequestListContext);
  if (!ctx) {
    throw new Error("useRequestList must be used within RequestListProvider");
  }
  return ctx;
}
