"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role, User } from "@/types";

interface AuthState {
  user: User | null;
  login: (email: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
  setRole: (role: Role) => void;
}

const DEMO_USERS: Record<string, User> = {
  "admin@pos.example": { id: "emp_1", name: "Sim Sintheng", email: "admin@pos.example", role: "ADMIN" },
  "manager@pos.example": { id: "emp_2", name: "Chenda Pich", email: "manager@pos.example", role: "MANAGER" },
  "cashier@pos.example": { id: "emp_3", name: "Vanna Heng", email: "cashier@pos.example", role: "CASHIER" },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      login: (email, password) => {
        const user = DEMO_USERS[email.trim().toLowerCase()];
        if (!user || password.length < 4) return { ok: false, error: "Invalid email or password" };
        set({ user });
        return { ok: true };
      },
      logout: () => set({ user: null }),
      setRole: (role) => {
        const u = get().user;
        if (u) set({ user: { ...u, role } });
      },
    }),
    { name: "pos-auth" },
  ),
);
