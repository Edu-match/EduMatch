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
  toggleRequestList as toggleStored,
  clearRequestList,
} from "@/lib/request-list";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";

type RequestListContextValue = {
  items: RequestListItem[];
  count: number;
  has: (serviceId: string) => boolean;
  add: (item: RequestListItem) => void;
  remove: (serviceId: string) => void;
  toggle: (item: RequestListItem) => boolean;
  isAuthenticated: boolean | null;
};

const RequestListContext = createContext<RequestListContextValue | null>(null);

export function RequestListProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<RequestListItem[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const refresh = useCallback((onlyIfAuthenticated?: boolean) => {
    if (typeof window === "undefined") return;
    if (onlyIfAuthenticated === false) {
      setItems([]);
      return;
    }
    setItems(getRequestList());
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const authenticated = !!user;
      setIsAuthenticated(authenticated);

      if (!authenticated) {
        clearRequestList();
        setItems([]);
      } else {
        setItems(getRequestList());
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAuth();
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isAuthenticated !== true) return;
    const handler = () => refresh();
    window.addEventListener("edumatch-request-list-change", handler);
    return () => window.removeEventListener("edumatch-request-list-change", handler);
  }, [isAuthenticated, refresh]);

  const add = useCallback((item: RequestListItem) => {
    if (isAuthenticated !== true) return;
    addStored(item);
    setItems(getRequestList());
  }, [isAuthenticated]);

  const remove = useCallback((serviceId: string) => {
    if (isAuthenticated !== true) return;
    removeStored(serviceId);
    setItems(getRequestList());
  }, [isAuthenticated]);

  const toggle = useCallback((item: RequestListItem) => {
    if (isAuthenticated !== true) return false;
    const added = toggleStored(item);
    setItems(getRequestList());
    return added;
  }, [isAuthenticated]);

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
    isAuthenticated,
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
