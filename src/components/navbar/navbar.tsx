"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, LogOut, Menu, Search, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { useUiStore } from "@/store/ui-store";
import { mockProducts } from "@/lib/mock-data";

export function Navbar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [query, setQuery] = useState("");

  const lowStock = mockProducts.filter((p) => p.stock <= p.minStock);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) router.push(`/products?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-card/90 px-4 backdrop-blur lg:px-6">
      <button className="lg:hidden" onClick={toggleSidebar} aria-label="Open menu">
        <Menu size={22} />
      </button>

      <form onSubmit={onSearch} className="relative max-w-md flex-1">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products..."
          className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
        />
      </form>

      <div className="ml-auto flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => {
              setNotifOpen((v) => !v);
              setMenuOpen(false);
            }}
            className="relative rounded-xl p-2 hover:bg-gray-100"
            aria-label="Notifications"
          >
            <Bell size={20} />
            {lowStock.length > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
                {lowStock.length}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-border bg-card p-3 shadow-lg">
              <p className="mb-2 text-sm font-semibold">Low stock alerts</p>
              <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
                {lowStock.map((p) => (
                  <li key={p.id} className="flex justify-between rounded-lg px-2 py-1.5 hover:bg-gray-50">
                    <span>{p.name}</span>
                    <span className="text-red-500">{p.stock} left</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => {
              setMenuOpen((v) => !v);
              setNotifOpen(false);
            }}
            className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-gray-100"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {user?.name.charAt(0)}
            </span>
            <span className="hidden text-left text-sm leading-tight sm:block">
              <span className="block font-medium">{user?.name}</span>
              <span className="block text-xs capitalize text-muted">{user?.role.toLowerCase()}</span>
            </span>
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-border bg-card p-1.5 shadow-lg">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/profile");
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
              >
                <UserRound size={16} /> Profile
              </button>
              <button
                onClick={() => {
                  logout();
                  toast.success("Signed out");
                  router.replace("/login");
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut size={16} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
