"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, Store, X } from "lucide-react";
import { NAV_ITEMS } from "@/constants/navigation";
import { useAuthStore } from "@/store/auth-store";
import { useUiStore } from "@/store/ui-store";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const role = useAuthStore((s) => s.user?.role);
  const { sidebarOpen, sidebarCollapsed, closeSidebar, toggleCollapse } = useUiStore();
  const items = NAV_ITEMS.filter((i) => role && i.roles.includes(role));

  // Keyboard shortcut: Cmd+B (Mac) or Ctrl+B (Windows/Linux) to toggle sidebar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleCollapse();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleCollapse]);

  return (
    <>
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar Aside */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-card transition-all duration-300 ease-in-out lg:static",
          // Mobile state: full w-64, slides in/out
          "w-64",
          sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0",
          // Desktop state: w-64 expanded, w-[72px] collapsed
          sidebarCollapsed ? "lg:w-[72px]" : "lg:w-64"
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "flex h-16 shrink-0 items-center border-b border-border/60 transition-all",
            sidebarCollapsed ? "justify-center px-2" : "justify-between px-5"
          )}
        >
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 font-semibold text-foreground overflow-hidden"
            title="Modern POS"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
              <Store size={18} />
            </span>
            {!sidebarCollapsed && (
              <span className="font-bold tracking-tight text-base whitespace-nowrap">
                Modern POS
              </span>
            )}
          </Link>

          {/* Header Toggle Button on Desktop */}
          {!sidebarCollapsed && (
            <button
              onClick={toggleCollapse}
              className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-gray-100 hover:text-foreground transition"
              title="Collapse sidebar (⌘B)"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft size={16} />
            </button>
          )}

          {/* Close Button on Mobile Drawer */}
          <button
            className="lg:hidden p-1.5 text-muted hover:bg-gray-100 hover:text-foreground rounded-lg transition"
            onClick={closeSidebar}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-2.5 py-3">
          {items.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                onClick={closeSidebar}
                title={sidebarCollapsed ? label : undefined}
                className={cn(
                  "group relative flex items-center rounded-xl font-medium transition-all",
                  sidebarCollapsed
                    ? "justify-center p-2.5 text-xs"
                    : "gap-3 px-3.5 py-2.5 text-sm",
                  active
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "text-muted hover:bg-gray-100 hover:text-foreground"
                )}
              >
                <Icon size={19} className="shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{label}</span>}

                {/* Floating Tooltip when collapsed */}
                {sidebarCollapsed && (
                  <span className="pointer-events-none absolute left-full ml-3 z-50 hidden whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1 text-xs font-medium text-white shadow-lg group-hover:block">
                    {label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer Toggle Bar on Desktop */}
        <div className="hidden lg:flex border-t border-border/60 p-2">
          <button
            type="button"
            onClick={toggleCollapse}
            className={cn(
              "flex w-full items-center rounded-xl py-2 text-xs font-medium text-muted hover:bg-gray-100 hover:text-foreground transition",
              sidebarCollapsed ? "justify-center px-1" : "justify-between px-3"
            )}
            title={sidebarCollapsed ? "Expand sidebar (⌘B)" : "Collapse sidebar (⌘B)"}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <ChevronLeft
                size={16}
                className={cn(
                  "transition-transform duration-200 shrink-0",
                  sidebarCollapsed && "rotate-180"
                )}
              />
              {!sidebarCollapsed && <span className="whitespace-nowrap">Collapse Sidebar</span>}
            </div>
            {!sidebarCollapsed && (
              <span className="text-[10px] text-gray-400 font-mono border border-border/80 rounded px-1.5 py-0.5">
                ⌘B
              </span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
