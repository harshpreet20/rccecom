import type { Metadata } from "next";
import "./admin.css";
import AuthProvider from "@/components/admin/AuthProvider";

// Nested layout scoped to the /admin section. It intentionally does NOT
// render its own <html>/<body> — the root layout (src/app/layout.tsx) owns
// those and the storefront's site-wide metadata. This layout only adds the
// admin-specific metadata override and wraps admin pages in AuthProvider
// plus a repainted wrapper (see admin.css's .admin-root) so the storefront's
// dark body theme doesn't bleed into the dashboard.
export const metadata: Metadata = {
  title: "Content Agent Dashboard",
  description: "6 AI agents managing your content",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-root">
      <AuthProvider>{children}</AuthProvider>
    </div>
  );
}
