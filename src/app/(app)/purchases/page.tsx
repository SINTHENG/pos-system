"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, type Column } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/fields";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { useResource } from "@/hooks/use-resource";
import { productService, purchaseService, stockMovementService, supplierService } from "@/services";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Purchase, PurchaseItem } from "@/types";

export default function PurchasesPage() {
  const purchases = useResource(purchaseService, "Purchase order");
  const suppliers = useResource(supplierService, "Supplier");
  const products = useResource(productService, "Product");
  const [creating, setCreating] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [lines, setLines] = useState<PurchaseItem[]>([]);
  const [pick, setPick] = useState({ productId: "", quantity: "1" });
  const [receiving, setReceiving] = useState<Purchase | null>(null);
  const [cancelling, setCancelling] = useState<Purchase | null>(null);
  const [viewing, setViewing] = useState<Purchase | null>(null);

  const supplierName = (id: string) => suppliers.items.find((s) => s.id === id)?.name ?? "-";
  const productName = (id: string) => products.items.find((p) => p.id === id)?.name ?? id;
  const total = lines.reduce((s, l) => s + l.quantity * l.unitCost, 0);

  function addLine() {
    const prod = products.items.find((p) => p.id === pick.productId);
    const qty = Number(pick.quantity);
    if (!prod) return toast.error("Select a product");
    if (!Number.isInteger(qty) || qty <= 0) return toast.error("Quantity must be a positive whole number");
    setLines((prev) => {
      const ex = prev.find((l) => l.productId === prod.id);
      return ex
        ? prev.map((l) => (l.productId === prod.id ? { ...l, quantity: l.quantity + qty } : l))
        : [...prev, { productId: prod.id, quantity: qty, unitCost: prod.purchasePrice }];
    });
    setPick({ productId: "", quantity: "1" });
  }

  async function createPo() {
    if (!supplierId) return toast.error("Select a supplier");
    if (lines.length === 0) return toast.error("Add at least one product");
    const created = await purchases.create({
      supplierId, items: lines, total: +total.toFixed(2), status: "ORDERED", createdAt: new Date().toISOString(),
    });
    if (created) {
      setCreating(false);
      setSupplierId("");
      setLines([]);
    }
  }

  async function receive() {
    if (!receiving) return;
    const now = new Date().toISOString();
    for (const item of receiving.items) {
      const prod = (await productService.get(item.productId));
      if (!prod) continue;
      await productService.update(prod.id, { stock: prod.stock + item.quantity, purchasePrice: item.unitCost });
      await stockMovementService.create({ productId: prod.id, type: "IN", quantity: item.quantity, note: `Received ${receiving.id}`, createdAt: now });
    }
    await purchases.update(receiving.id, { status: "RECEIVED" });
    await products.reload();
    setReceiving(null);
  }

  const columns: Column<Purchase>[] = [
    { key: "id", header: "PO", sortValue: (p) => p.id, render: (p) => <button className="font-medium text-primary hover:underline" onClick={() => setViewing(p)}>{p.id}</button> },
    { key: "supplier", header: "Supplier", render: (p) => supplierName(p.supplierId) },
    { key: "createdAt", header: "Date", sortValue: (p) => p.createdAt, render: (p) => formatDate(p.createdAt) },
    { key: "items", header: "Items", render: (p) => p.items.length },
    { key: "total", header: "Total", sortValue: (p) => p.total, render: (p) => formatCurrency(p.total) },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} /> },
    {
      key: "actions", header: "",
      render: (p) => p.status === "ORDERED" ? (
        <div className="flex justify-end gap-1">
          <Button size="sm" onClick={() => setReceiving(p)}>Receive</Button>
          <Button size="sm" variant="outline" onClick={() => setCancelling(p)}>Cancel</Button>
        </div>
      ) : null,
    },
  ];

  return (
    <>
      <PageHeader title="Purchases" description="Purchase orders and receiving"
        actions={<Button onClick={() => setCreating(true)}><Plus size={16} /> New purchase order</Button>} />
      <DataTable columns={columns} rows={[...purchases.items].sort((a, b) => b.createdAt.localeCompare(a.createdAt))}
        loading={purchases.loading} error={purchases.error} onRetry={purchases.reload}
        searchText={(p) => `${p.id} ${supplierName(p.supplierId)}`} searchPlaceholder="Search PO or supplier..." />

      <Modal open={creating} onClose={() => setCreating(false)} title="New purchase order" className="max-w-2xl">
        <div className="space-y-4">
          <Field label="Supplier">
            <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">Select supplier...</option>
              {suppliers.items.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Field label="Product">
                <Select value={pick.productId} onChange={(e) => setPick({ ...pick, productId: e.target.value })}>
                  <option value="">Select product...</option>
                  {products.items.map((p) => <option key={p.id} value={p.id}>{p.name} (cost {formatCurrency(p.purchasePrice)})</option>)}
                </Select>
              </Field>
            </div>
            <div className="w-24">
              <Field label="Qty"><Input type="number" min={1} value={pick.quantity} onChange={(e) => setPick({ ...pick, quantity: e.target.value })} /></Field>
            </div>
            <Button variant="outline" onClick={addLine}>Add</Button>
          </div>
          {lines.length > 0 && (
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted"><tr><th className="py-2">Product</th><th>Qty</th><th>Unit cost</th><th className="text-right">Line total</th><th /></tr></thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.productId} className="border-t border-border">
                    <td className="py-2">{productName(l.productId)}</td>
                    <td>
                      <Input type="number" min={1} className="h-8 w-20" value={l.quantity}
                        onChange={(e) => setLines((prev) => prev.map((x) => x.productId === l.productId ? { ...x, quantity: Math.max(1, Number(e.target.value) || 1) } : x))} />
                    </td>
                    <td>{formatCurrency(l.unitCost)}</td>
                    <td className="text-right">{formatCurrency(l.quantity * l.unitCost)}</td>
                    <td className="text-right"><button aria-label="Remove" onClick={() => setLines((prev) => prev.filter((x) => x.productId !== l.productId))}><Trash2 size={14} className="text-red-500" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="text-right text-lg font-semibold">Total: {formatCurrency(total)}</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
            <Button onClick={createPo}>Create order</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={`Purchase ${viewing?.id ?? ""}`}>
        {viewing && (
          <div className="space-y-3 text-sm">
            <p><span className="text-muted">Supplier: </span>{supplierName(viewing.supplierId)}</p>
            <p><span className="text-muted">Status: </span><StatusBadge status={viewing.status} /></p>
            <ul className="divide-y divide-border">
              {viewing.items.map((i) => (
                <li key={i.productId} className="flex justify-between py-2">
                  <span>{productName(i.productId)} x {i.quantity}</span><span>{formatCurrency(i.quantity * i.unitCost)}</span>
                </li>
              ))}
            </ul>
            <p className="text-right font-semibold">Total: {formatCurrency(viewing.total)}</p>
          </div>
        )}
      </Modal>
      <ConfirmDialog open={!!receiving} title="Receive purchase" message={`Mark ${receiving?.id} as received and add its items to stock?`}
        confirmLabel="Receive" onConfirm={receive} onCancel={() => setReceiving(null)} />
      <ConfirmDialog open={!!cancelling} destructive title="Cancel purchase" message={`Cancel ${cancelling?.id}?`} confirmLabel="Cancel order"
        onConfirm={async () => { if (cancelling) await purchases.update(cancelling.id, { status: "CANCELLED" }); setCancelling(null); }} onCancel={() => setCancelling(null)} />
    </>
  );
}
