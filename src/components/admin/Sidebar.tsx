"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "./AuthProvider";

type Tone = "gray" | "emerald" | "violet";
type LinkItem = { href: string; label: string };
type Section = { title: string; tone: Tone; links: LinkItem[] };

const toneClasses: Record<Tone, { active: string; inactive: string }> = {
  gray: { active: "bg-gray-100 text-gray-900", inactive: "text-gray-500 hover:bg-gray-50 hover:text-gray-700" },
  emerald: { active: "bg-emerald-50 text-emerald-700", inactive: "text-gray-500 hover:bg-gray-50 hover:text-emerald-700" },
  violet: { active: "bg-violet-50 text-violet-700", inactive: "text-gray-500 hover:bg-gray-50 hover:text-violet-700" },
};

const ICONS: Record<string, JSX.Element> = {
  "/admin": (
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  ),
  "/admin/sponsor": (
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
  ),
  "/admin/reports": (
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  ),
  "/admin/analytics": (
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2" />
  ),
  "/admin/reviews": (
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  ),
  "/admin/orders": (
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 2a1 1 0 00-1 1v1H5a1 1 0 00-.994.89l-1 9A1 1 0 003 14h18a1 1 0 00.994-1.11l-1-9A1 1 0 0020 3h-3V3a1 1 0 00-1-1H9zm1 2h4v1h-4V4zM3 16v4a2 2 0 002 2h14a2 2 0 002-2v-4H3z" />
  ),
  "/admin/products": (
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  ),
  "/admin/insights": (
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  ),
  "/admin/customers": (
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8zm6 4v-2a4 4 0 00-3-3.87M9 12a4 4 0 100-8 4 4 0 000 8z" />
  ),
  "/admin/categories": (
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
  ),
  "/admin/discounts": (
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v3.586a1 1 0 00.293.707l7.414 7.414a1 1 0 001.414 0l5.586-5.586a1 1 0 000-1.414L12.293 4.293A1 1 0 0011.586 4H9zM7 8h.01" />
  ),
  "/admin/settings": (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </>
  ),
  "/admin/users": (
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8zm6 4v-2a4 4 0 00-3-3.87M9 12a4 4 0 100-8 4 4 0 000 8z" />
  ),
};

function SidebarLinks({ sections, active, onNavigate }: { sections: Section[]; active: string; onNavigate?: () => void }) {
  return (
    <div className="flex flex-col gap-5">
      {sections.map((section) => (
        <div key={section.title}>
          <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">{section.title}</p>
          <div className="flex flex-col gap-0.5">
            {section.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={onNavigate}
                className={`flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                  active === link.href ? toneClasses[section.tone].active : toneClasses[section.tone].inactive
                }`}
              >
                {ICONS[link.href] && (
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    {ICONS[link.href]}
                  </svg>
                )}
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Sidebar({ active }: { active: string }) {
  const { user, isAdmin, isStaff, isContent, signOut, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const sections: Section[] = [
    ...(isContent
      ? [{ title: "Content AI", tone: "gray" as Tone, links: [
          { href: "/admin", label: "Dashboard" },
          { href: "/admin/sponsor", label: "Sponsor" },
          { href: "/admin/reports", label: "Reports" },
        ] }]
      : []),
    { title: "Performance", tone: "gray", links: [
      { href: "/admin/analytics", label: "Analytics" },
      { href: "/admin/reviews", label: "Reviews" },
    ] },
    ...(isStaff
      ? [{ title: "Commerce", tone: "emerald" as Tone, links: [
          { href: "/admin/orders", label: "Orders" },
          { href: "/admin/products", label: "Store" },
          { href: "/admin/categories", label: "Categories" },
          { href: "/admin/discounts", label: "Discounts" },
          { href: "/admin/customers", label: "Customers" },
          { href: "/admin/insights", label: "Insights" },
          { href: "/admin/settings", label: "Settings" },
        ] }]
      : []),
    ...(isAdmin
      ? [{ title: "Super Admin", tone: "violet" as Tone, links: [
          { href: "/admin/users", label: "User Management" },
        ] }]
      : []),
  ];

  const Logo = (
    <Link href="/admin" className="flex items-center gap-3">
      <img
        src="/rcc-crest.webp"
        alt="RCC"
        className="w-10 h-10 rounded-full object-cover"
        style={{ boxShadow: "0 3px 6px rgba(15,23,42,0.18), 0 1px 2px rgba(15,23,42,0.12), inset 0 1px 1px rgba(255,255,255,0.6)" }}
      />
      <span className="text-base font-extrabold bg-gradient-to-r from-amber-500 via-pink-500 to-violet-600 bg-clip-text text-transparent">
        ContentAgent
      </span>
    </Link>
  );

  const UserFooter = user && (
    <div className="flex items-center gap-2.5 px-1">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 via-pink-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
        {user.email?.[0].toUpperCase() || "U"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-700 truncate">{user.email}</p>
        {!loading && (
          <button onClick={signOut} className="text-[11px] text-gray-400 hover:text-gray-600 font-medium transition">
            Sign out
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 h-16 z-40 bg-white border-b border-gray-200 flex items-center justify-between px-5">
        <Link href="/admin" className="flex items-center gap-2.5">
          <img
            src="/rcc-crest.webp"
            alt="RCC"
            className="w-9 h-9 rounded-full object-cover"
            style={{ boxShadow: "0 3px 6px rgba(15,23,42,0.18), 0 1px 2px rgba(15,23,42,0.12), inset 0 1px 1px rgba(255,255,255,0.6)" }}
          />
          <span className="text-base font-extrabold bg-gradient-to-r from-amber-500 via-pink-500 to-violet-600 bg-clip-text text-transparent">
            ContentAgent
          </span>
        </Link>
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          className="w-9 h-9 rounded-lg flex items-center justify-center border border-gray-200 text-gray-500 hover:bg-gray-50"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-64 bg-white border-r border-gray-200 p-5 z-30">
        <div className="mb-6">{Logo}</div>
        <div className="flex-1 overflow-y-auto">
          <SidebarLinks sections={sections} active={active} />
        </div>
        <div className="pt-4 mt-4 border-t border-gray-200">{UserFooter}</div>
      </aside>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMenuOpen(false)} />
          <div className="relative w-72 max-w-[80vw] h-full bg-white p-5 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              {Logo}
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 text-gray-500 hover:bg-gray-50 shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarLinks sections={sections} active={active} onNavigate={() => setMenuOpen(false)} />
            </div>
            <div className="pt-4 mt-4 border-t border-gray-200">{UserFooter}</div>
          </div>
        </div>
      )}
    </>
  );
}
