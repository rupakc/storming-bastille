"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";

export function ChangePasswordPage() {
  const { token, user, updateTokenAfterPasswordChange } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.next !== form.confirm) {
      setError("New passwords do not match");
      return;
    }
    if (form.next.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: form.current,
          new_password: form.next,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.detail || "Password change failed");
        return;
      }
      const data = await res.json();
      updateTokenAfterPasswordChange(data.access_token);
      router.replace("/");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--bg-primary)]">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--accent)]/10 mb-4">
            <KeyRound
              size={32}
              className="text-[var(--accent)]"
              strokeWidth={1.8}
            />
          </div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-display)] text-[var(--text-primary)] tracking-tight">
            Set your password
          </h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            Welcome,{" "}
            <span className="font-medium text-[var(--text-secondary)]">
              {user?.username}
            </span>
            ! Please set a new password to continue.
          </p>
        </div>

        {/* Card */}
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] shadow-[0_8px_30px_rgba(0,0,0,0.08)] p-8">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Temporary password
              </label>
              <input
                type="password"
                required
                autoFocus
                value={form.current}
                onChange={(e) =>
                  setForm((f) => ({ ...f, current: e.target.value }))
                }
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                New password
              </label>
              <input
                type="password"
                required
                value={form.next}
                onChange={(e) =>
                  setForm((f) => ({ ...f, next: e.target.value }))
                }
                placeholder="At least 8 characters"
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Confirm new password
              </label>
              <input
                type="password"
                required
                value={form.confirm}
                onChange={(e) =>
                  setForm((f) => ({ ...f, confirm: e.target.value }))
                }
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-[var(--accent)] text-white font-semibold text-sm hover:bg-[var(--accent-hover)] disabled:opacity-60 transition-colors shadow-sm"
            >
              {loading ? "Saving..." : "Set password & continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
