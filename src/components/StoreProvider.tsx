"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Property } from "@/lib/types";
import { loadProperties, saveProperty } from "@/lib/store";
import { supabase } from "@/lib/supabaseClient";
import { LoginScreen } from "./LoginScreen";
import type { Session } from "@supabase/supabase-js";

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
  const [session, setSession] = useState<Session | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setAuthLoaded(true);
      })
      .catch(() => {
        // Supabase unreachable — still show the login screen
        setAuthLoaded(true);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const refresh = useCallback(async () => {
    const list = await loadProperties();
    setProperties(list);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (authLoaded && session) {
      refresh();
    }
  }, [authLoaded, session, refresh]);

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

  if (!authLoaded) {
    return <div className="loading-screen">Initializing…</div>;
  }

  if (!session) {
    return <LoginScreen />;
  }

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
