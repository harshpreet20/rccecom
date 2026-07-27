"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getBrowserSupabase } from "@/lib/supabase-browser";

type Mode = "login" | "signup";

const field =
  "mt-1 w-full rounded-lg border border-rcc-line bg-rcc-panel2 px-3 py-2.5 text-rcc-sand outline-none transition focus:border-rcc-gold focus:ring-2 focus:ring-rcc-gold/30";

export default function AccountLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function ensureProfile(userId: string, fallbackEmail: string) {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    const { data: existing } = await supabase
      .from("customer_profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    if (!existing) {
      await supabase.from("customer_profiles").upsert({
        id: userId,
        email: fallbackEmail,
        phone: phone.trim() || null,
        name: name.trim() || null,
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const supabase = getBrowserSupabase();
    if (!supabase) {
      setError("Account sign-in isn't configured yet. Please try again later.");
      return;
    }
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "signup") {
        if (!name.trim()) {
          setError("Enter your name.");
          setSubmitting(false);
          return;
        }
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (signUpError) {
          setError(signUpError.message);
          setSubmitting(false);
          return;
        }
        const userId = data.user?.id;
        if (userId) {
          await supabase.from("customer_profiles").upsert({
            id: userId,
            email: email.trim(),
            phone: phone.trim() || null,
            name: name.trim(),
          });
        }
        if (!data.session) {
          setError("");
          setSubmitting(false);
          setMode("login");
          setError("Check your inbox to confirm your email, then log in.");
          return;
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) {
          setError(signInError.message);
          setSubmitting(false);
          return;
        }
        if (data.user) {
          await ensureProfile(data.user.id, email.trim());
        }
      }

      router.push("/account");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-black text-rcc-sand">
        {mode === "login" ? "Log in" : "Create your account"}
      </h1>
      <p className="mt-1 text-sm text-rcc-mist">
        {mode === "login"
          ? "Access your profile and order history."
          : "Save your details for faster checkout and order tracking."}
      </p>

      <div className="mt-6 inline-flex rounded-full border border-rcc-line bg-rcc-panel2 p-1 text-sm font-semibold">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError("");
          }}
          className={`rounded-full px-4 py-1.5 transition ${
            mode === "login" ? "bg-rcc-gold text-rcc-night" : "text-rcc-mist hover:text-rcc-sand"
          }`}
        >
          Log in
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setError("");
          }}
          className={`rounded-full px-4 py-1.5 transition ${
            mode === "signup" ? "bg-rcc-gold text-rcc-night" : "text-rcc-mist hover:text-rcc-sand"
          }`}
        >
          Sign up
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-4 rounded-2xl border border-rcc-line bg-rcc-panel p-5 sm:p-6"
      >
        {mode === "signup" && (
          <label className="block text-sm font-semibold text-rcc-sand">
            Full name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={field}
              placeholder="Priya Sharma"
              autoComplete="name"
            />
          </label>
        )}
        <label className="block text-sm font-semibold text-rcc-sand">
          Email
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={field}
            placeholder="you@email.com"
            type="email"
            autoComplete="email"
          />
        </label>
        {mode === "signup" && (
          <label className="block text-sm font-semibold text-rcc-sand">
            Mobile number
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={field}
              placeholder="9876543210"
              inputMode="numeric"
              autoComplete="tel"
            />
          </label>
        )}
        <label className="block text-sm font-semibold text-rcc-sand">
          Password
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={field}
            type="password"
            placeholder="••••••••"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </label>

        {error && (
          <p className="min-h-[1rem] text-sm font-semibold text-rcc-clay">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="btn-tactile w-full rounded-full py-3 text-sm font-black uppercase tracking-wide text-rcc-night disabled:opacity-70"
        >
          {submitting
            ? "Please wait…"
            : mode === "login"
              ? "Log in"
              : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-rcc-mist/70">
        <Link href="/" className="font-semibold text-rcc-leaf hover:underline">
          ← Back to shop
        </Link>
      </p>
    </div>
  );
}
