"use client";

import { useMemo, useState } from "react";
import {
  Banknote,
  CreditCard,
  LogIn,
  LogOut,
  Minus,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  ShieldAlert,
  ShoppingCart,
  Trash2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/fields";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { ProductImage } from "@/components/products/product-image";
import { ReceiptModal } from "@/components/pos/receipt-modal";
import { ShiftModal } from "@/components/shifts/shift-modal";
import { useResource } from "@/hooks/use-resource";
import { categoryService, customerService, orderService, productService, stockMovementService } from "@/services";
import { computeTotals, useCartStore } from "@/store/cart-store";
import { useSettingsStore } from "@/store/settings-store";
import { useShiftStore } from "@/store/shift-store";
import { getNextOrderSequence } from "@/lib/order-number";
import { cn, formatCurrency } from "@/lib/utils";
import type { Order, PaymentMethod } from "@/types";

const METHODS: { id: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { id: "CASH", label: "Cash", icon: Banknote },
  { id: "CARD", label: "Card", icon: CreditCard },
  { id: "QR", label: "QR", icon: QrCode },
];

export default function PosPage() {
  const products = useResource(productService, "Product");
  const categories = useResource(categoryService, "Category");
  const customers = useResource(customerService, "Customer");
  const orders = useResource(orderService, "Order");
  const cart = useCartStore();
  const settings = useSettingsStore((s) => s.settings);
  const { activeShift, openShift, recordOrderToShift, staffMembers } = useShiftStore();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [newCustomer, setNewCustomer] = useState(false);
  const [custForm, setCustForm] = useState({ name: "", phone: "" });
  const [confirmClear, setConfirmClear] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [receipt, setReceipt] = useState<Order | null>(null);
  const [shiftModalMode, setShiftModalMode] = useState<"open" | "close" | "switch" | null>(null);
  const [quickStaffModal, setQuickStaffModal] = useState(false);
  const [cashTendered, setCashTendered] = useState<string>("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.items.filter(
      (p) =>
        (!category || p.categoryId === category) &&
        (!q || p.name.toLowerCase().includes(q) || p.barcode.includes(q) || p.sku.toLowerCase().includes(q)),
    );
  }, [products.items, query, category]);

  const totals = computeTotals(cart.lines, cart.discountType, cart.discountValue, settings.taxRate, settings.taxEnabled);
  const money = (n: number) => formatCurrency(n, settings.currency);

  // Cash change calculation
  const tenderedNum = parseFloat(cashTendered) || 0;
  const changeDue = tenderedNum >= totals.total ? +(tenderedNum - totals.total).toFixed(2) : 0;

  function addProduct(id: string) {
    const p = products.items.find((x) => x.id === id);
    if (!p) return;
    if (p.stock <= 0) return toast.error(`${p.name} is out of stock`);
    if (!cart.add(p)) toast.error(`Only ${p.stock} of ${p.name} in stock`);
  }

  // Pressing Enter in the search box with an exact barcode match adds the item (barcode scanner friendly).
  function onSearchEnter(e: React.KeyboardEvent) {
    if (e.key !== "Enter") return;
    const hit = products.items.find((p) => p.barcode === query.trim());
    if (hit) {
      addProduct(hit.id);
      setQuery("");
    }
  }

  async function saveCustomer() {
    if (custForm.name.trim().length < 2) return toast.error("Enter the customer name");
    const c = await customers.create({ name: custForm.name.trim(), phone: custForm.phone, createdAt: new Date().toISOString() });
    if (c) cart.setCustomer(c.id);
    setCustForm({ name: "", phone: "" });
    setNewCustomer(false);
  }

  // Quick 1-click shift start for Staff 1 or Staff 2
  function quickStartShift(staffId: "staff_1" | "staff_2") {
    const staffName = staffId === "staff_1" ? "Staff 1" : "Staff 2";
    const res = openShift(staffId, 100, "Started from POS");
    if (res.ok) {
      toast.success(`Shift opened for ${staffName}`);
    } else {
      toast.error(res.error ?? "Failed to open shift");
    }
  }

  async function handleCheckoutClick() {
    if (cart.lines.length === 0) return toast.error("Cart is empty");

    // If no shift is open, prompt cashier to select Staff 1 or Staff 2
    if (!activeShift) {
      setQuickStaffModal(true);
      return;
    }

    await executeSale(activeShift.staffId, activeShift.staffName, activeShift.id);
  }

  async function handleQuickStaffSelect(staffId: string) {
    setQuickStaffModal(false);
    const staff = staffMembers.find((s) => s.id === staffId) ?? {
      id: staffId,
      name: staffId === "staff_1" ? "Staff 1" : "Staff 2",
    };

    // Open shift for this staff member
    const res = openShift(staff.id, 100, "Shift auto-started on checkout");
    if (!res.ok && !activeShift) {
      toast.error(res.error ?? "Failed to open shift");
      return;
    }

    const currentShift = res.shift ?? activeShift;
    if (!currentShift) return;

    toast.success(`Shift opened for ${staff.name}`);
    await executeSale(currentShift.staffId, currentShift.staffName, currentShift.id);
  }

  async function executeSale(staffId: string, staffName: string, shiftId: string) {
    setProcessing(true);

    try {
      const now = new Date().toISOString();
      // Continuous global order sequence shared across all staff & shifts
      const { nextSequence, orderNumber, id: generatedId } = getNextOrderSequence(orders.items);

      const orderPayload = {
        id: generatedId,
        orderNumber,
        customerId: cart.customerId || "cus_1",
        cashierId: staffId,
        cashierName: staffName,
        shiftId: shiftId,
        items: cart.lines.map((l) => ({
          productId: l.product.id,
          name: l.product.name,
          price: l.product.sellingPrice,
          quantity: l.quantity,
        })),
        ...totals,
        paymentMethod: cart.paymentMethod,
        paymentStatus: "PAID" as const,
        status: "COMPLETED" as const,
        createdAt: now,
      };

      let completedOrder: Order;
      try {
        completedOrder = await orderService.create(orderPayload);
      } catch (apiError) {
        console.warn("API create order failed, using local order record:", apiError);
        // Resilient fallback so the cashier's checkout never fails
        completedOrder = {
          ...orderPayload,
          sequenceNumber: nextSequence,
        };
      }

      // Ensure local order has orderNumber & cashier details
      completedOrder.orderNumber = orderNumber;
      completedOrder.sequenceNumber = nextSequence;
      completedOrder.cashierName = staffName;

      // Update active shift stats in shift store
      recordOrderToShift(totals.total);

      // Deduct stock and record movements safely (auxiliary logging never breaks customer sale)
      try {
        await Promise.all(
          cart.lines.flatMap((l) => [
            productService.update(l.product.id, { stock: Math.max(0, l.product.stock - l.quantity) }),
            stockMovementService.create({
              productId: l.product.id,
              type: "SALE",
              quantity: l.quantity,
              note: completedOrder.id,
              createdAt: now,
            }),
          ]),
        );
      } catch (stockErr) {
        console.warn("Stock update warning:", stockErr);
      }

      // Refresh product stock and order list in background
      void products.reload();
      void orders.reload();

      cart.clear();
      setCashTendered("");
      setReceipt(completedOrder);
      toast.success(`Sale ${orderNumber} (${completedOrder.id}) completed by ${staffName}`);
    } catch (e) {
      console.error("Complete sale error:", e);
      toast.error((e as { message?: string })?.message ?? "Failed to complete sale");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* SHIFT BANNER ON POS */}
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-2.5 shadow-xs transition-all",
          activeShift
            ? "border-emerald-200 bg-gradient-to-r from-emerald-50/90 to-teal-50/70"
            : "border-amber-200 bg-gradient-to-r from-amber-50/90 to-orange-50/70"
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl font-bold text-white shadow-xs text-xs",
              activeShift
                ? activeShift.staffId === "staff_1"
                  ? "bg-indigo-600"
                  : "bg-emerald-600"
                : "bg-amber-500"
            )}
          >
            {activeShift ? (activeShift.staffId === "staff_1" ? "S1" : "S2") : "OFF"}
          </div>

          <div>
            {activeShift ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-gray-900 text-sm">
                  {activeShift.staffName}
                </span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                  Active Shift
                </span>
                <span className="text-xs text-muted">
                  · {activeShift.totalOrders ?? 0} orders · {formatCurrency(activeShift.totalSales ?? 0)}
                </span>
              </div>
            ) : (
              <div>
                <p className="font-bold text-amber-950 text-sm flex items-center gap-1.5">
                  <ShieldAlert size={15} className="text-amber-600" />
                  No Active Shift – Select Staff to Start
                </p>
                <p className="text-xs text-amber-800">
                  Only one staff shift can be active at a time.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeShift ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-gray-300 bg-white text-xs hover:bg-gray-100"
                onClick={() => setShiftModalMode("switch")}
              >
                <RefreshCw size={13} className="mr-1.5 text-primary" /> Switch Staff
              </Button>
              <Button
                variant="danger"
                size="sm"
                className="h-8 text-xs font-medium"
                onClick={() => setShiftModalMode("close")}
              >
                <LogOut size={13} className="mr-1.5" /> Close Shift
              </Button>
            </>
          ) : (
            <>
              {/* Quick 1-click staff selection buttons so cashier is never blocked */}
              <button
                type="button"
                onClick={() => quickStartShift("staff_1")}
                className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-xs hover:bg-indigo-50"
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] text-white font-bold">
                  1
                </span>
                Start Staff 1
              </button>
              <button
                type="button"
                onClick={() => quickStartShift("staff_2")}
                className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-xs hover:bg-emerald-50"
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] text-white font-bold">
                  2
                </span>
                Start Staff 2
              </button>
              <Button
                size="sm"
                className="h-8 bg-amber-600 px-3 text-xs font-semibold text-white hover:bg-amber-700 shadow-xs"
                onClick={() => setShiftModalMode("open")}
              >
                <LogIn size={13} className="mr-1.5" /> Custom Shift...
              </Button>
            </>
          )}
        </div>
      </div>

      {/* POS MAIN GRID */}
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1fr_380px]">
        {/* Product area */}
        <section className="flex min-h-0 flex-col">
          <div className="mb-3 flex flex-shrink-0 flex-wrap gap-3">
            <div className="relative min-w-52 flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onSearchEnter}
                placeholder="Search name or scan barcode..."
                className="pl-9"
              />
            </div>
          </div>
          <div className="mb-3 flex flex-shrink-0 gap-2 overflow-x-auto pb-1">
            {[{ id: "", name: "All" }, ...categories.items].map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={cn(
                  "whitespace-nowrap rounded-full border px-4 py-1.5 text-sm",
                  category === c.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-gray-50",
                )}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {products.loading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }, (_, i) => <div key={i} className="h-44 animate-pulse rounded-2xl bg-gray-100" />)}
              </div>
            ) : products.error ? (
              <div className="rounded-2xl bg-red-50 p-6 text-sm text-red-700">
                {products.error} <Button size="sm" variant="outline" onClick={products.reload}>Retry</Button>
              </div>
            ) : visible.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted">No products found.</div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {visible.map((p) => {
                  const out = p.stock <= 0;
                  return (
                    <button
                      key={p.id}
                      onClick={() => addProduct(p.id)}
                      disabled={out}
                      className={cn(
                        "overflow-hidden rounded-2xl border border-border bg-card text-left shadow-xs transition hover:shadow-md",
                        out && "cursor-not-allowed opacity-50",
                      )}
                    >
                      <ProductImage name={p.name} imageUrl={p.imageUrl} className="h-24 w-full" />
                      <div className="p-3">
                        <p className="truncate text-sm font-medium">{p.name}</p>
                        <p className="text-sm font-semibold text-primary">{money(p.sellingPrice)}</p>
                        <p className={cn("text-xs", out ? "text-red-500" : p.stock <= p.minStock ? "text-amber-600" : "text-muted")}>
                          {out ? "Out of stock" : `${p.stock} in stock`}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Cart */}
        <aside className="flex min-h-0 flex-col rounded-2xl border border-border bg-card p-4 shadow-xs">
          <div className="mb-3 flex flex-shrink-0 items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold"><ShoppingCart size={18} /> Current order</h2>
            <button
              disabled={cart.lines.length === 0}
              onClick={() => setConfirmClear(true)}
              className="text-xs text-red-500 disabled:opacity-40"
            >
              Clear cart
            </button>
          </div>

          <div className="mb-3 flex flex-shrink-0 gap-2">
            <Select value={cart.customerId} onChange={(e) => cart.setCustomer(e.target.value)}>
              {customers.items.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Button variant="outline" aria-label="New customer" onClick={() => setNewCustomer(true)}><UserPlus size={16} /></Button>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {cart.lines.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted">
                <ShoppingCart /> Cart is empty
              </div>
            )}
            {cart.lines.map((l) => (
              <div key={l.product.id} className="flex items-center gap-3 rounded-xl border border-border p-2">
                <ProductImage name={l.product.name} imageUrl={l.product.imageUrl} className="h-10 w-10 rounded-lg text-base" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{l.product.name}</p>
                  <p className="text-xs text-muted">{money(l.product.sellingPrice)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button className="rounded-lg border border-border p-1" aria-label="Decrease" onClick={() => cart.setQty(l.product.id, l.quantity - 1)}><Minus size={12} /></button>
                  <span className="w-6 text-center text-sm">{l.quantity}</span>
                  <button className="rounded-lg border border-border p-1" aria-label="Increase" onClick={() => addProduct(l.product.id)}><Plus size={12} /></button>
                </div>
                <span className="w-16 text-right text-sm font-medium">{money(l.product.sellingPrice * l.quantity)}</span>
                <button aria-label="Remove" onClick={() => cart.remove(l.product.id)}><Trash2 size={14} className="text-red-500" /></button>
              </div>
            ))}
          </div>

          <div className="mt-3 flex-shrink-0 space-y-3 border-t border-border pt-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted">Discount</span>
              <Input
                type="number"
                min={0}
                value={cart.discountValue || ""}
                onChange={(e) => cart.setDiscount(cart.discountType, Number(e.target.value) || 0)}
                className="h-8 w-20"
              />
              <Select value={cart.discountType} onChange={(e) => cart.setDiscount(e.target.value as "PERCENT" | "AMOUNT", cart.discountValue)} className="h-8 w-20">
                <option value="PERCENT">%</option>
                <option value="AMOUNT">$</option>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="flex justify-between"><span className="text-muted">Subtotal</span><span>{money(totals.subtotal)}</span></p>
              <p className="flex justify-between"><span className="text-muted">Discount</span><span>-{money(totals.discount)}</span></p>
              <p className="flex justify-between"><span className="text-muted">Tax ({settings.taxEnabled ? `${settings.taxRate}%` : "off"})</span><span>{money(totals.tax)}</span></p>
              <p className="flex justify-between text-lg font-semibold"><span>Total</span><span>{money(totals.total)}</span></p>
            </div>

            {/* PAYMENT METHODS */}
            <div className="grid grid-cols-3 gap-2">
              {METHODS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => cart.setPayment(id)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl border py-2 text-xs font-medium transition",
                    cart.paymentMethod === id ? "border-primary bg-primary/10 text-primary font-bold shadow-xs" : "border-border hover:bg-gray-50",
                  )}
                >
                  <Icon size={18} /> {label}
                </button>
              ))}
            </div>

            {/* CASH PAYMENT QUICK TENDER */}
            {cart.paymentMethod === "CASH" && cart.lines.length > 0 && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-2.5 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-emerald-950">Cash Tendered ($):</span>
                  <div className="flex gap-1">
                    {[totals.total, 10, 20, 50, 100]
                      .filter((val, i, arr) => arr.indexOf(val) === i && val >= Math.floor(totals.total))
                      .slice(0, 4)
                      .map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setCashTendered(String(val))}
                          className="rounded bg-white px-1.5 py-0.5 text-[10px] font-medium border border-emerald-300 text-emerald-900 hover:bg-emerald-100"
                        >
                          {val === totals.total ? "Exact" : `$${val}`}
                        </button>
                      ))}
                  </div>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  placeholder={String(totals.total)}
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  className="h-8 bg-white font-medium text-sm"
                />
                {tenderedNum > 0 && (
                  <div className="flex justify-between font-medium pt-1 border-t border-emerald-200 text-xs">
                    <span>Change Due:</span>
                    <span className={cn("font-bold", tenderedNum >= totals.total ? "text-emerald-700" : "text-amber-700")}>
                      {tenderedNum >= totals.total ? money(changeDue) : "Insufficient cash"}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* QR CODE PAYMENT */}
            {cart.paymentMethod === "QR" && cart.lines.length > 0 && (
              <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-border p-3 text-xs text-muted">
                <QrCode size={64} className="text-foreground" />
                Scan to pay {money(totals.total)}
              </div>
            )}

            {/* COMPLETE SALE BUTTON - NEVER DISABLED WHEN CART HAS ITEMS */}
            <Button
              className="w-full text-base font-semibold py-5 shadow-sm"
              onClick={handleCheckoutClick}
              disabled={processing || cart.lines.length === 0}
            >
              {processing
                ? "Processing..."
                : !activeShift
                ? `Pay · ${money(totals.total)} (Select Staff)`
                : `Complete sale · ${money(totals.total)}`}
            </Button>
          </div>
        </aside>
      </div>

      {/* QUICK STAFF SELECTOR MODAL FOR CHECKOUT */}
      <Modal
        open={quickStaffModal}
        onClose={() => setQuickStaffModal(false)}
        title="Select Staff Member to Complete Sale"
        className="max-w-md"
      >
        <div className="space-y-4 pt-1 text-sm">
          <p className="text-xs text-muted">
            Please choose which staff member is cashiering this sale. This opens their shift and completes the payment.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleQuickStaffSelect("staff_1")}
              className="flex flex-col items-center gap-2 rounded-2xl border-2 border-indigo-200 bg-indigo-50/50 p-4 transition hover:border-indigo-500 hover:bg-indigo-50"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white text-base shadow-xs">
                S1
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-900">Staff 1</p>
                <p className="text-[11px] text-muted">staff1@pos.example</p>
              </div>
              <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-800">
                Cashier
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickStaffSelect("staff_2")}
              className="flex flex-col items-center gap-2 rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 p-4 transition hover:border-emerald-500 hover:bg-emerald-50"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 font-bold text-white text-base shadow-xs">
                S2
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-900">Staff 2</p>
                <p className="text-[11px] text-muted">staff2@pos.example</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                Cashier
              </span>
            </button>
          </div>

          <div className="flex justify-end pt-2 border-t border-border">
            <Button variant="outline" onClick={() => setQuickStaffModal(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={newCustomer} onClose={() => setNewCustomer(false)} title="New customer" className="max-w-sm">
        <div className="space-y-3">
          <Input placeholder="Full name" value={custForm.name} onChange={(e) => setCustForm({ ...custForm, name: e.target.value })} />
          <Input placeholder="Phone" value={custForm.phone} onChange={(e) => setCustForm({ ...custForm, phone: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setNewCustomer(false)}>Cancel</Button>
            <Button onClick={saveCustomer}>Save customer</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmClear}
        destructive
        title="Clear cart"
        message="Remove all items from the current order?"
        confirmLabel="Clear"
        onConfirm={() => { cart.clear(); setConfirmClear(false); }}
        onCancel={() => setConfirmClear(false)}
      />

      <ReceiptModal order={receipt} customer={customers.items.find((c) => c.id === receipt?.customerId)} onClose={() => setReceipt(null)} />

      <ShiftModal
        open={shiftModalMode !== null}
        mode={shiftModalMode ?? "open"}
        onClose={() => setShiftModalMode(null)}
      />
    </div>
  );
}
