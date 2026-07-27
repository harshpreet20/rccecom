"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/admin/AuthProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/admin/Sidebar";

interface AppUser {
  id: string;
  auth_user_id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function AdminPage() {
  const { user, loading: authLoading, isAdmin, status } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/admin/login");
    if (!authLoading && user && !isAdmin) router.push("/admin");
  }, [user, authLoading, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;
    loadUsers();
  }, [isAdmin]);

  async function loadUsers() {
    try {
      const res = await fetch("/api/admin/admin/users");
      const json = await res.json();
      setUsers(json.users || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function updateUser(userId: string, updates: { status?: string; role?: string }) {
    setActionLoading(userId);
    try {
      await fetch("/api/admin/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...updates }),
      });
      await loadUsers();
    } catch {
      // silent
    } finally {
      setActionLoading(null);
    }
  }

  async function deleteUser(userId: string, email: string) {
    if (!confirm(`Remove ${email} from the system?`)) return;
    setActionLoading(userId);
    try {
      await fetch(`/api/admin/users?id=${userId}`, { method: "DELETE" });
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch {
      // silent
    } finally {
      setActionLoading(null);
    }
  }

  if (authLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f6f8]">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pendingUsers = users.filter((u) => u.status === "pending");
  const approvedUsers = users.filter((u) => u.status === "approved");
  const rejectedUsers = users.filter((u) => u.status === "rejected");

  return (
    <div className="min-h-screen bg-[#f5f6f8] pt-16 md:pt-0 md:pl-64">
      <Sidebar active="/admin/users" />

      <main className="max-w-5xl mx-auto px-5 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-extrabold text-gray-900">User Management</h2>
          <p className="text-sm text-gray-400 mt-0.5">Approve, reject, or manage user access</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#f5f6f8] rounded-2xl p-5 neu-card">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg mb-3 bg-blue-50">👥</div>
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Total Users</div>
                <div className="text-3xl font-extrabold text-gray-900">{users.length}</div>
              </div>
              <div className="bg-[#f5f6f8] rounded-2xl p-5 neu-card">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg mb-3 bg-amber-50">⏳</div>
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Pending</div>
                <div className="text-3xl font-extrabold text-amber-500">{pendingUsers.length}</div>
              </div>
              <div className="bg-[#f5f6f8] rounded-2xl p-5 neu-card">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg mb-3 bg-green-50">✅</div>
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Approved</div>
                <div className="text-3xl font-extrabold text-green-600">{approvedUsers.length}</div>
              </div>
              <div className="bg-[#f5f6f8] rounded-2xl p-5 neu-card">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg mb-3 bg-violet-50">👑</div>
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Admins</div>
                <div className="text-3xl font-extrabold text-violet-600">{users.filter((u) => u.role === "admin").length}</div>
              </div>
            </div>

            {/* Pending approvals */}
            {pendingUsers.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-amber-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  Pending Approval ({pendingUsers.length})
                </h3>
                <div className="space-y-2">
                  {pendingUsers.map((u) => (
                    <UserRow key={u.id} user={u} actionLoading={actionLoading} onUpdate={updateUser} onDelete={deleteUser} />
                  ))}
                </div>
              </section>
            )}

            {/* Approved users */}
            <section>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Active Users ({approvedUsers.length})
              </h3>
              <div className="space-y-2">
                {approvedUsers.map((u) => (
                  <UserRow key={u.id} user={u} actionLoading={actionLoading} onUpdate={updateUser} onDelete={deleteUser} />
                ))}
              </div>
            </section>

            {/* Rejected users */}
            {rejectedUsers.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-red-500 uppercase tracking-wide mb-3">
                  Rejected ({rejectedUsers.length})
                </h3>
                <div className="space-y-2">
                  {rejectedUsers.map((u) => (
                    <UserRow key={u.id} user={u} actionLoading={actionLoading} onUpdate={updateUser} onDelete={deleteUser} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function UserRow({
  user,
  actionLoading,
  onUpdate,
  onDelete,
}: {
  user: AppUser;
  actionLoading: string | null;
  onUpdate: (id: string, updates: { status?: string; role?: string }) => void;
  onDelete: (id: string, email: string) => void;
}) {
  const isLoading = actionLoading === user.id;
  const statusColors: Record<string, string> = {
    pending: "bg-amber-50 text-amber-600",
    approved: "bg-green-50 text-green-600",
    rejected: "bg-red-50 text-red-500",
  };
  const roleColors: Record<string, string> = {
    admin: "bg-violet-50 text-violet-600",
    sales: "bg-blue-50 text-blue-600",
    content: "bg-pink-50 text-pink-600",
    user: "bg-gray-50 text-gray-500",
  };

  return (
    <div className="bg-[#f5f6f8] rounded-2xl neu-card p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 via-pink-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold shrink-0 neu-raised-sm">
        {user.email[0].toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-sm text-gray-900 truncate">{user.email}</div>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase neu-flat ${statusColors[user.status] || ""}`}>
            {user.status}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase neu-flat ${roleColors[user.role] || ""}`}>
            {user.role}
          </span>
          <span className="text-[10px] text-gray-300">
            Joined {new Date(user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            {user.status === "pending" && (
              <>
                <button
                  onClick={() => onUpdate(user.id, { status: "approved" })}
                  className="px-3 py-1.5 text-[11px] font-semibold bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all neu-btn"
                >
                  Approve
                </button>
                <button
                  onClick={() => onUpdate(user.id, { status: "rejected" })}
                  className="px-3 py-1.5 text-[11px] font-semibold text-red-500 rounded-lg transition-all neu-btn"
                >
                  Reject
                </button>
              </>
            )}
            {user.status === "approved" && (
              <select
                value={user.role}
                onChange={(e) => onUpdate(user.id, { role: e.target.value })}
                className="px-2 py-1.5 text-[11px] font-semibold text-gray-600 rounded-lg neu-input outline-none bg-[#f5f6f8]"
              >
                <option value="user">User</option>
                <option value="content">Content</option>
                <option value="sales">Sales</option>
                <option value="admin">Super Admin</option>
              </select>
            )}
            {user.status === "rejected" && (
              <button
                onClick={() => onUpdate(user.id, { status: "approved" })}
                className="px-3 py-1.5 text-[11px] font-semibold text-green-600 rounded-lg transition-all neu-btn"
              >
                Approve
              </button>
            )}
            <button
              onClick={() => onDelete(user.id, user.email)}
              className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg transition-all neu-btn"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
