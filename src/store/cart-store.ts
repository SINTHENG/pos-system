"use client";

import { create } from "zustand";
import type { PaymentMethod, Product } from "@/types";

export interface CartLine {
  product: Product;
  quantity: number;
}

interface CartState {
  lines: CartLine[];
  customerId: string;
  discountType: "PERCENT" | "AMOUNT";
  discountValue: number;
  paymentMethod: PaymentMethod;
  add: (product: Product) => boolean;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  setCustomer: (id: string) => void;
  setDiscount: (type: "PERCENT" | "AMOUNT", value: number) => void;
  setPayment: (m: PaymentMethod) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  lines: [],
  customerId: "cus_1",
  discountType: "PERCENT",
  discountValue: 0,
  paymentMethod: "CASH",
  add: (product) => {
    const existing = get().lines.find((l) => l.product.id === product.id);
    const next = (existing?.quantity ?? 0) + 1;
    if (next > product.stock) return false;
    set((s) => ({
      lines: existing
        ? s.lines.map((l) => (l.product.id === product.id ? { ...l, quantity: next } : l))
        : [...s.lines, { product, quantity: 1 }],
    }));
    return true;
  },
  setQty: (productId, qty) =>
    set((s) => ({
      lines: s.lines
        .map((l) => (l.product.id === productId ? { ...l, quantity: Math.min(qty, l.product.stock) } : l))
        .filter((l) => l.quantity > 0),
    })),
  remove: (productId) => set((s) => ({ lines: s.lines.filter((l) => l.product.id !== productId) })),
  setCustomer: (customerId) => set({ customerId }),
  setDiscount: (discountType, discountValue) => set({ discountType, discountValue }),
  setPayment: (paymentMethod) => set({ paymentMethod }),
  clear: () => set({ lines: [], discountValue: 0, discountType: "PERCENT", paymentMethod: "CASH", customerId: "cus_1" }),
}));

export function computeTotals(
  lines: CartLine[],
  discountType: "PERCENT" | "AMOUNT",
  discountValue: number,
  taxRate: number,
  taxEnabled: boolean,
) {
  const subtotal = lines.reduce((s, l) => s + l.product.sellingPrice * l.quantity, 0);
  const rawDiscount = discountType === "PERCENT" ? (subtotal * discountValue) / 100 : discountValue;
  const discount = Math.min(Math.max(rawDiscount, 0), subtotal);
  const taxable = subtotal - discount;
  const tax = taxEnabled ? (taxable * taxRate) / 100 : 0;
  const round = (n: number) => Math.round(n * 100) / 100;
  return { subtotal: round(subtotal), discount: round(discount), tax: round(tax), total: round(taxable + tax) };
}
