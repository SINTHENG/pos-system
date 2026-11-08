"use client";

import { useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, SlidersHorizontal, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, type Column } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/fields";
import { Modal } from "@/components/ui/modal";
import { useResource } from "@/hooks/use-resource";
import { productService, stockMovementService } from "@/services";
import { stockStatus } from "@/lib/analytics";
import { cn, formatDate } from "@/lib/utils";
import type { Product, StockMovement, StockMovementType } from "@/types";

type Action = { product: Product; type: "IN" | "OUT" | "ADJUSTMENT" };

export default function InventoryPage() {
  const products = useResource(productService, "Product");
  const movements = useResource(stockMovementService, "Movement");
  const [tab, setTab] = useState<"stock" | "history">("stock");
  const [action, setAction] = useState<Action | null>(null);
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [histProduct, setHistProduct] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const out = products.items.filter((p) => stockStatus(p) === "OUT");
  const low = products.items.filter((p) => stockStatus(p) === "LOW");
  const nameOf = (id: string) => products.items.find((p) => p.id === id)?.name ?? id;

  const stockColumns: Column<Product>[] = [
    { key: "name", header: "Product", sortValue: (p) => p.name, render: (p) => <span className="font-medium">{p.name}</span> },
    { key: "sku", header: "SKU" },
    { key: "stock", header: "On hand", sortValue: (p) => p.stock },
    { key: "minStock", header: "Min level", sortValue: (p) => p.minStock },
    {
      key: "status", header: "Status",
      render: (p) => {
        const s = stockStatus(p);
        return s === "OUT" ? <Badge tone="red">Out of stock</Badge> : s === "LOW" ? <Badge tone="yellow">Low stock</Badge> : <Badge tone="green">OK</Badge>;
      },
    },
    {
      key: "actions", header: "",
      render: (p) => (
        <div className="flex justify-end gap-1">
          <Button variant="outline" size="sm" onClick={() => openAction(p, "IN")}><ArrowDownToLine size={12} /> In</Button>
          <Button variant="outline" size="sm" onClick={() => openAction(p, "OUT")}><ArrowUpFromLine size={12} /> Out</Button>
          <Button variant="outline" size="sm" onClick={() => openAction(p, "ADJUSTMENT")}><SlidersHorizontal size={12} /> Adjust</Button>
        </div>
      ),
    },
  ];

  const sortedMovements = useMemo(() => {
    return movements.items
      .filter((m) => (!histProduct || m.productId === histProduct))
      .filter((m) => (!from || m.createdAt.slice(0, 10) >= from) && (!to || m.createdAt.slice(0, 10) <= to))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [movements.items, histProduct, from, to]);

  const historyColumns: Column<StockMovement>[] = [
    { key: "createdAt", header: "Date", sortValue: (m) => m.createdAt, render: (m) => formatDate(m.createdAt) },
    { key: "product", header: "Product", render: (m) => nameOf(m.productId) },
    { key: "type", header: "Type", render: (m) => <StatusBadge status={m.type} /> },
    { key: "quantity", header: "Quantity", sortValue: (m) => m.quantity },
    { key: "note", header: "Note", render: (m) => m.note || "-" },
  ];

  function openAction(product: Product, type: Action["type"]) {
    setAction({ product, type });
    setQty(type === "ADJUSTMENT" ? String(product.stock) : "");
    setNote("");
  }

  async function submit() {
    if (!action) return;
    const n = Number(qty);
    if (!Number.isInteger(n) || n < 0 || (action.type !== "ADJUSTMENT" && n === 0)) return toast.error("Enter a valid whole-number quantity");
    const { product, type } = action;
    let newStock = product.stock;
    let moved = n;
    if (type === "IN") newStock += n;
    if (type === "OUT") {
      if (n > product.stock) return toast.error("Cannot remove more than on hand");
      newStock -= n;
    }
    if (type === "ADJUSTMENT") {
      newStock = n;
      moved = Math.abs(n - product.stock);
    }
    setBusy(true);
    try {
      await productService.update(product.id, { stock: newStock });
      await stockMovementService.create({
        productId: product.id,
        type: type as StockMovementType,
        quantity: moved,
        note: note || (type === "ADJUSTMENT" ? `Adjusted ${product.stock} -> ${newStock}` : undefined),
        createdAt: new Date().toISOString(),
      });
      await Promise.all([products.reload(), movements.reload()]);
      toast.success("Stock updated");
      setAction(null);
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Failed to update stock");
    } finally {
      setBusy(false);
    }
  }

  const titles = { IN: "Stock in", OUT: "Stock out", ADJUSTMENT: "Stock adjustment" };

  return (
    <>
      <PageHeader title="Inventory" description="Current stock levels and movement history" />

      {(out.length > 0 || low.length > 0) && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          {out.length > 0 && (
            <div className="flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
              <TriangleAlert size={18} /> <div><p className="font-semibold">{out.length} out of stock</p><p>{out.map((p) => p.name).join(", ")}</p></div>
            </div>
          )}
          {low.length > 0 && (
            <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-700">
              <TriangleAlert size={18} /> <div><p className="font-semibold">{low.length} low on stock</p><p>{low.map((p) => p.name).join(", ")}</p></div>
            </div>
          )}
        </div>
      )}

      <div className="mb-4 inline-flex rounded-xl border border-border bg-card p-1 text-sm">
        {(["stock", "history"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("rounded-lg px-4 py-1.5", tab === t ? "bg-primary text-primary-foreground" : "text-muted")}>
            {t === "stock" ? "Current inventory" : "Movement history"}
          </button>
        ))}
      </div>

      {tab === "stock" ? (
        <DataTable columns={stockColumns} rows={products.items} loading={products.loading} error={products.error} onRetry={products.reload}
          searchText={(p) => `${p.name} ${p.sku}`} searchPlaceholder="Search products..." />
      ) : (
        <DataTable columns={historyColumns} rows={sortedMovements} loading={movements.loading} error={movements.error} onRetry={movements.reload}
          emptyMessage="No stock movements for these filters."
          filters={
            <>
              <Select className="w-48" value={histProduct} onChange={(e) => setHistProduct(e.target.value)}>
                <option value="">All products</option>
                {products.items.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
              <Input type="date" className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
              <Input type="date" className="w-40" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
            </>
          } />
      )}

      <Modal open={!!action} onClose={() => setAction(null)} title={action ? `${titles[action.type]} - ${action.product.name}` : ""} className="max-w-sm">
        {action && (
          <div className="space-y-4">
            <p className="text-sm text-muted">On hand: {action.product.stock}</p>
            <Field label={action.type === "ADJUSTMENT" ? "New stock count" : "Quantity"}>
              <Input type="number" min={0} value={qty} onChange={(e) => setQty(e.target.value)} autoFocus />
            </Field>
            <Field label="Note (optional)"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAction(null)}>Cancel</Button>
              <Button onClick={submit} disabled={busy}>{busy ? "Saving..." : "Confirm"}</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
