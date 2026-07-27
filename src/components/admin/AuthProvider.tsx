"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  supabase: SupabaseClient | null;
  role: string | null;
  status: string | null;
  statusError: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isContent: boolean;
  signOut: () => Promise<void>;
  retryStatus: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  supabase: null,
  role: null,
  status: null,
  statusError: false,
  isAdmin: false,
  isStaff: false,
  isContent: false,
  signOut: async () => {},
  retryStatus: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

function getClientSideSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [statusError, setStatusError] = useState(false);
  const [sb] = useState<SupabaseClient | null>(() => getClientSideSupabase());

  async function fetchUserStatus(authUser: User, accessToken?: string | null) {
    if (!accessToken) {
      setRole(null);
      setStatus(null);
      setStatusError(true);
      return;
    }
    try {
      const res = await fetch("/api/admin/auth/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || `status ${res.status}`);
      setRole(json.role ?? null);
      setStatus(json.status ?? null);
      setStatusError(false);
    } catch {
      setRole(null);
      setStatus(null);
      setStatusError(true);
    }
  }

  useEffect(() => {
    if (!sb) {
      setLoading(false);
      return;
    }

    sb.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchUserStatus(session.user, session.access_token);
        }
      })
      .catch(() => {
        setSession(null);
        setUser(null);
      })
      .finally(() => setLoading(false));

    const { data: { subscription } } = sb.auth.onAuthStateChange(async (_event, session) => {
      // getSession() above already handled the initial session and fired
      // fetchUserStatus for it; without this guard, INITIAL_SESSION fires a
      // second concurrent status-check call for every user on load.
      if (_event === "INITIAL_SESSION") return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserStatus(session.user, session.access_token);
      } else {
        setRole(null);
        setStatus(null);
        setStatusError(false);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [sb]);

  // Re-check role/status when the tab regains focus, so an admin approving or
  // promoting this user elsewhere shows up without requiring a manual sign-out.
  useEffect(() => {
    if (!user || !session) return;
    function onFocus() {
      if (user && session) fetchUserStatus(user, session.access_token);
    }
    function onVisibilityChange() {
      if (document.visibilityState === "visible") onFocus();
    }
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [user, session]);

  const retryStatus = () => {
    if (user && session) {
      setStatusError(false);
      fetchUserStatus(user, session.access_token);
    }
  };

  const signOut = async () => {
    if (sb) await sb.auth.signOut();
    setRole(null);
    setStatus(null);
  };

  const isAdmin = role === "admin" && status === "approved";
  const isStaff = (role === "admin" || role === "sales") && status === "approved";
  const isContent = (role === "admin" || role === "content") && status === "approved";

  return (
    <AuthContext.Provider
      value={{ user, session, loading, supabase: sb, role, status, statusError, isAdmin, isStaff, isContent, signOut, retryStatus }}
    >
      {children}
    </AuthContext.Provider>
  );
}
