"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface StoreSettings {
  storeName: string;
  logoUrl: string;
  address: string;
  phone: string;
  email: string;
  currency: string;
  taxRate: number; // percent
  taxEnabled: boolean;
  receiptHeader: string;
  receiptFooter: string;
  showReceiptLogo: boolean;
}

interface SettingsState {
  settings: StoreSettings;
  update: (patch: Partial<StoreSettings>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: {
        storeName: "Modern Mart",
        logoUrl: "",
        address: "St. 51, Phnom Penh, Cambodia",
        phone: "+855 23 123 456",
        email: "hello@modernmart.example",
        currency: "USD",
        taxRate: 10,
        taxEnabled: true,
        receiptHeader: "Welcome to Modern Mart",
        receiptFooter: "Thank you for shopping with us!",
        showReceiptLogo: true,
      },
      update: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
    }),
    { name: "pos-settings" },
  ),
);
