"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UiState {
  sidebarOpen: boolean; // mobile drawer
  sidebarCollapsed: boolean; // desktop collapsed/rail state
  toggleSidebar: () => void;
  closeSidebar: () => void;
  toggleCollapse: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarOpen: false,
      sidebarCollapsed: false,
      toggleSidebar: () =>
        set((s) => {
          if (typeof window !== "undefined" && window.innerWidth >= 1024) {
            return { sidebarCollapsed: !s.sidebarCollapsed };
          }
          return { sidebarOpen: !s.sidebarOpen };
        }),
      closeSidebar: () => set({ sidebarOpen: false }),
      toggleCollapse: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setCollapsed: (collapsed: boolean) => set({ sidebarCollapsed: collapsed }),
    }),
    {
      name: "pos-ui-store",
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
    }
  )
);
