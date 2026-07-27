"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getBrowserSupabase } from "@/lib/supabase-browser";

type CustomerAuthValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const CustomerAuthContext = createContext<CustomerAuthValue | null>(null);

/**
 * Minimal client-side auth state for storefront customers — session/user
 * only, no role/status/approval workflow (that's the admin CRM's concern).
 * Wrap around the root layout so any page can call useCustomerAuth().
 */
export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const value = useMemo<CustomerAuthValue>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      signOut: async () => {
        const supabase = getBrowserSupabase();
        if (supabase) await supabase.auth.signOut();
        setSession(null);
      },
    }),
    [session, loading],
  );

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error("useCustomerAuth must be used within CustomerAuthProvider");
  return ctx;
}
