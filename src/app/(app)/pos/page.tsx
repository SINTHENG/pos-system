"use client";

import { useMemo, useState } from "react";
import { Banknote, CreditCard, Minus, Plus, QrCode, Search, ShoppingCart, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/fields";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { ProductImage } from "@/components/products/product-image";
import { ReceiptModal } from "@/components/pos/receipt-modal";
import { useResource } from "@/hooks/use-resource";
import { categoryService, customerService, orderService, productService, stockMovementService } from "@/services";
import { computeTotals, useCartStore } from "@/store/cart-store";
import { useSettingsStore } from "@/store/settings-store";
import { useAuthStore } from "@/store/auth-store";
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
  const cart = useCartStore();
  const settings = useSettingsStore((s) => s.settings);
  const user = useAuthStore((s) => s.user);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [newCustomer, setNewCustomer] = useState(false);
  const [custForm, setCustForm] = useState({ name: "", phone: "" });
  const [confirmClear, setConfirmClear] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [receipt, setReceipt] = useState<Order | null>(null);

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

  async function completeSale() {
    if (cart.lines.length === 0) return toast.error("Cart is empty");
    setProcessing(true);
    try {
      const now = new Date().toISOString();
      const order = await orderService.create({
        customerId: cart.customerId,
        cashierId: user?.id ?? "unknown",
        items: cart.lines.map((l) => ({
          productId: l.product.id,
          name: l.product.name,
          price: l.product.sellingPrice,
          quantity: l.quantity,
        })),
        ...totals,
        paymentMethod: cart.paymentMethod,
        paymentStatus: "PAID",
        status: "COMPLETED",
        createdAt: now,
      });
      // Deduct stock and record movements.
      await Promise.all(
        cart.lines.flatMap((l) => [
          productService.update(l.product.id, { stock: l.product.stock - l.quantity }),
          stockMovementService.create({ productId: l.product.id, type: "SALE", quantity: l.quantity, note: order.id, createdAt: now }),
        ]),
      );
      await products.reload();
      cart.clear();
      setReceipt(order);
      toast.success(`Sale ${order.id} completed`);
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Failed to complete sale");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="grid h-full gap-4 lg:grid-cols-[1fr_380px]">
      {/* Product area */}
      <section className="flex min-h-0 flex-col">
        <div className="mb-3 flex flex-wrap gap-3">
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
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
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
                      "overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition hover:shadow-md",
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
      <aside className="flex min-h-0 flex-col rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold"><ShoppingCart size={18} /> Current order</h2>
          <button
            disabled={cart.lines.length === 0}
            onClick={() => setConfirmClear(true)}
            className="text-xs text-red-500 disabled:opacity-40"
          >
            Clear cart
          </button>
        </div>

        <div className="mb-3 flex gap-2">
          <Select value={cart.customerId} onChange={(e) => cart.setCustomer(e.target.value)}>
            {customers.items.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Button variant="outline" aria-label="New customer" onClick={() => setNewCustomer(true)}><UserPlus size={16} /></Button>
        </div>

        <div className="min-h-32 flex-1 space-y-2 overflow-y-auto">
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

        <div className="mt-3 space-y-3 border-t border-border pt-3 text-sm">
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
          <div className="grid grid-cols-3 gap-2">
            {METHODS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => cart.setPayment(id)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border py-2 text-xs",
                  cart.paymentMethod === id ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-gray-50",
                )}
              >
                <Icon size={18} /> {label}
              </button>
            ))}
          </div>
          {cart.paymentMethod === "QR" && cart.lines.length > 0 && (
            <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-border p-3 text-xs text-muted">
              <QrCode size={64} className="text-foreground" />
              Scan to pay {money(totals.total)}
            </div>
          )}
          <Button className="w-full" onClick={completeSale} disabled={processing || cart.lines.length === 0}>
            {processing ? "Processing..." : `Complete sale · ${money(totals.total)}`}
          </Button>
        </div>
      </aside>

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
    </div>
  );
}
