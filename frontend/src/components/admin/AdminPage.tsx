"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdminUser {
  id: string;
  username: string;
  email: string | null;
  is_admin: boolean;
  is_first_login: boolean;
  is_active: boolean;
  created_at: string;
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function AdminPage() {
  const { isAdmin, loading, token, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace("/");
    }
  }, [loading, isAdmin, router]);

  if (loading) return null;
  if (!isAdmin) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold font-[family-name:var(--font-display)] text-[var(--text-primary)] mb-2">
        Admin Panel
      </h1>
      <p className="text-[var(--text-muted)] text-sm mb-8">
        Manage user accounts and access.
      </p>
      <UsersTab token={token} currentUsername={user?.username} />
    </div>
  );
}

// ── Users Tab ─────────────────────────────────────────────────────────────────

function UsersTab({
  token,
  currentUsername,
}: {
  token: string | null;
  currentUsername?: string;
}) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    is_admin: false,
  });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [resetTarget, setResetTarget] = useState<string | null>(null);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/users", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setUsers)
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        setFormError(err.detail || "Failed to create user");
        return;
      }
      setForm({ username: "", email: "", password: "", is_admin: false });
      setShowCreate(false);
      fetchUsers();
    } catch {
      setFormError("Something went wrong");
    } finally {
      setFormLoading(false);
    }
  };

  const toggleActive = async (u: AdminUser) => {
    const url = u.is_active
      ? `/api/admin/users/${encodeURIComponent(u.username)}`
      : `/api/admin/users/${encodeURIComponent(u.username)}/reactivate`;
    const method = u.is_active ? "DELETE" : "POST";
    await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchUsers();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-[var(--text-muted)]">
          {users.length} user{users.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={() => setShowCreate((s) => !s)}
          className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Create user
        </button>
      </div>

      {showCreate && (
        <form
          onSubmit={createUser}
          className="mb-6 p-4 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl space-y-3"
        >
          <h3 className="font-semibold text-[var(--text-primary)] text-sm">
            New user
          </h3>
          {formError && (
            <p className="text-red-500 dark:text-red-400 text-sm">{formError}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                Username *
              </label>
              <input
                value={form.username}
                onChange={(e) =>
                  setForm((f) => ({ ...f, username: e.target.value }))
                }
                className="w-full px-3 py-1.5 border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                Email (optional)
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                className="w-full px-3 py-1.5 border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                Temporary password *
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
                className="w-full px-3 py-1.5 border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                required
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={form.is_admin}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, is_admin: e.target.checked }))
                  }
                  className="w-4 h-4 accent-[var(--accent)]"
                />
                Admin privileges
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={formLoading}
              className="px-4 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {formLoading ? "Creating..." : "Create"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-1.5 bg-[var(--bg-secondary)] hover:bg-[var(--border-subtle)] text-[var(--text-secondary)] text-sm font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">Loading...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-secondary)] text-[var(--text-muted)] text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Username</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">
                  Email
                </th>
                <th className="px-4 py-3 text-left hidden md:table-cell">
                  Created
                </th>
                <th className="px-4 py-3 text-center">Role</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {users.map((u) => (
                <tr
                  key={u.username}
                  className={
                    u.is_active
                      ? "text-[var(--text-primary)]"
                      : "opacity-50 text-[var(--text-muted)]"
                  }
                >
                  <td className="px-4 py-3 font-medium">{u.username}</td>
                  <td className="px-4 py-3 text-[var(--text-muted)] hidden sm:table-cell">
                    {u.email || "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)] hidden md:table-cell">
                    {u.created_at
                      ? new Date(u.created_at).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.is_admin
                          ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                          : "bg-[var(--bg-secondary)] text-[var(--text-muted)]"
                      }`}
                    >
                      {u.is_admin ? "Admin" : "User"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        !u.is_active
                          ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                          : u.is_first_login
                          ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                          : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                      }`}
                    >
                      {!u.is_active
                        ? "Inactive"
                        : u.is_first_login
                        ? "Pending"
                        : "Active"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {u.is_active && (
                        <button
                          onClick={() => setResetTarget(u.username)}
                          className={`text-xs px-2 py-1 rounded-md font-medium transition-colors ${
                            u.username === currentUsername
                              ? "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                              : "text-[var(--accent)] hover:bg-[var(--accent)]/10"
                          }`}
                          title={
                            u.username === currentUsername
                              ? "You will be required to change your password on next login"
                              : undefined
                          }
                        >
                          {u.username === currentUsername
                            ? "Reset own pw"
                            : "Reset pw"}
                        </button>
                      )}
                      {u.username !== currentUsername && (
                        <button
                          onClick={() => toggleActive(u)}
                          className={`text-xs px-2 py-1 rounded-md font-medium transition-colors ${
                            u.is_active
                              ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                              : "text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                          }`}
                        >
                          {u.is_active ? "Deactivate" : "Reactivate"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {resetTarget && (
        <ResetPasswordModal
          username={resetTarget}
          token={token}
          isSelf={resetTarget === currentUsername}
          onClose={() => setResetTarget(null)}
          onSuccess={fetchUsers}
        />
      )}
    </div>
  );
}

// ── Reset Password Modal ──────────────────────────────────────────────────────

function ResetPasswordModal({
  username,
  token,
  isSelf,
  onClose,
  onSuccess,
}: {
  username: string;
  token: string | null;
  isSelf: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleClose = useCallback(() => {
    if (!loading) onClose();
  }, [loading, onClose]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [handleClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/users/${encodeURIComponent(username)}/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ new_password: form.password }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        setError(err.detail || "Failed to reset password");
        return;
      }
      setSuccess(true);
      onSuccess();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleClose}
    >
      <div
        className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
          Reset password
        </h2>
        <p className="text-sm text-[var(--text-muted)] mb-3">
          Setting a new password for{" "}
          <span className="font-medium text-[var(--text-secondary)]">
            {username}
          </span>
          . They will be required to change it on next login.
        </p>

        {isSelf && (
          <div className="mb-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 text-sm text-amber-700 dark:text-amber-300">
            You are resetting your own password. You will be redirected to the
            change-password page on next page load.
          </div>
        )}

        {success ? (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/40 text-sm text-green-700 dark:text-green-400">
              Password reset for {username}. They will be prompted to set a new
              password on next login.
            </div>
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--border-subtle)] text-[var(--text-secondary)] text-sm font-medium rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <p className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/40 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                New password *
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
                className="w-full px-3 py-2 border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                placeholder="Min. 8 characters"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                Confirm password *
              </label>
              <input
                type="password"
                value={form.confirm}
                onChange={(e) =>
                  setForm((f) => ({ ...f, confirm: e.target.value }))
                }
                className="w-full px-3 py-2 border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                placeholder="Repeat the new password"
                required
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {loading ? "Resetting..." : "Reset password"}
              </button>
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--border-subtle)] disabled:opacity-50 text-[var(--text-secondary)] text-sm font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
