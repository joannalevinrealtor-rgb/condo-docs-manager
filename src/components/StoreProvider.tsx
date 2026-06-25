"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Property } from "@/lib/types";
import { loadProperties, saveProperty } from "@/lib/store";

interface StoreCtx {
  loaded: boolean;
  properties: Property[];
  /** Insert or update a property, persisting it and refreshing in-memory state. */
  saveProp: (p: Property) => Promise<void>;
  /** Re-read everything from the data layer. */
  refresh: () => Promise<void>;
}

const Ctx = createContext<StoreCtx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const list = await loadProperties();
    setProperties(list);
    setLoaded(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveProp = useCallback(async (p: Property) => {
    await saveProperty(p);
    setProperties((prev) => {
      const idx = prev.findIndex((x) => x.id === p.id);
      if (idx === -1) return [...prev, p];
      const next = prev.slice();
      next[idx] = p;
      return next;
    });
  }, []);

  return (
    <Ctx.Provider value={{ loaded, properties, saveProp, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useStore(): StoreCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
