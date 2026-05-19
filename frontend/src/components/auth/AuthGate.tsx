"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { LoginPage } from "./LoginPage";
import type { ReactNode } from "react";

const PUBLIC_PATHS = new Set(["/login", "/change-password"]);

export function AuthGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading, requiresPasswordChange } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) return; // handled by render below
    // Force password change before allowing any other navigation
    if (requiresPasswordChange && pathname !== "/change-password") {
      router.replace("/change-password");
    }
  }, [loading, isAuthenticated, requiresPasswordChange, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-[var(--text-muted)] text-sm">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Allow change-password and login pages without auth
    if (PUBLIC_PATHS.has(pathname)) return <>{children}</>;
    return <LoginPage />;
  }

  return <>{children}</>;
}
