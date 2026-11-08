"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { NAV_ITEMS } from "@/constants/navigation";
import { useAuthStore } from "@/store/auth-store";
import { Sidebar } from "@/components/sidebar/sidebar";
import { Navbar } from "@/components/navbar/navbar";

/** Client-side guard: redirects to /login when signed out and enforces role-based routes. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    const item = NAV_ITEMS.find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
    if (item && !item.roles.includes(user.role)) router.replace("/pos");
  }, [hydrated, user, pathname, router]);

  const isReady = hydrated && !!user;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {!isReady ? (
            <div className="flex h-64 items-center justify-center text-sm text-muted">
              Loading...
            </div>
          ) : null}
          <div className={!isReady ? "hidden" : undefined}>{children}</div>
        </main>
      </div>
    </div>
  );
}
