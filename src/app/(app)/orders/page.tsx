"use client";

import { useState } from "react";
import { Eye, Printer } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, type Column } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/fields";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { ReceiptModal } from "@/components/pos/receipt-modal";
import { useResource } from "@/hooks/use-resource";
import { customerService, employeeService, orderService } from "@/services";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Order } from "@/types";

export default function OrdersPage() {
  const orders = useResource(orderService, "Order");
  const customers = useResource(customerService, "Customer");
  const employees = useResource(employeeService, "Employee");
  const [status, setStatus] = useState("");
  const [payment, setPayment] = useState("");
  const [date, setDate] = useState("");
  const [viewing, setViewing] = useState<Order | null>(null);
  const [printing, setPrinting] = useState<Order | null>(null);
  const [changing, setChanging] = useState<{ order: Order; to: "CANCELLED" | "REFUNDED" } | null>(null);

  const customerOf = (id?: string) => customers.items.find((c) => c.id === id);
  const rows = [...orders.items]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter((o) => (!status || o.status === status) && (!payment || o.paymentStatus === payment) && (!date || o.createdAt.slice(0, 10) === date));

  const columns: Column<Order>[] = [
    { key: "id", header: "Order", sortValue: (o) => o.id, render: (o) => <span className="font-medium">{o.id}</span> },
    { key: "createdAt", header: "Date", sortValue: (o) => o.createdAt, render: (o) => formatDate(o.createdAt) },
    { key: "customer", header: "Customer", render: (o) => customerOf(o.customerId)?.name ?? "Walk-in" },
    { key: "items", header: "Items", render: (o) => o.items.reduce((s, i) => s + i.quantity, 0) },
    { key: "payment", header: "Payment", render: (o) => o.paymentMethod },
    { key: "paymentStatus", header: "Paid?", render: (o) => <StatusBadge status={o.paymentStatus} /> },
    { key: "status", header: "Status", render: (o) => <StatusBadge status={o.status} /> },
    { key: "total", header: "Total", sortValue: (o) => o.total, render: (o) => formatCurrency(o.total) },
    {
      key: "actions", header: "",
      render: (o) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" aria-label="View" onClick={() => setViewing(o)}><Eye size={14} /></Button>
          <Button variant="ghost" size="sm" aria-label="Print" onClick={() => setPrinting(o)}><Printer size={14} /></Button>
        </div>
      ),
    },
  ];

  async function applyChange() {
    if (!changing) return;
    const { order, to } = changing;
    const updated = await orders.update(order.id, {
      status: to,
      paymentStatus: to === "REFUNDED" ? "REFUNDED" : order.paymentStatus,
    });
    if (updated && viewing?.id === order.id) setViewing(updated);
    setChanging(null);
  }

  return (
    <>
      <PageHeader title="Orders" description="All sales and their payment status" />
      <DataTable columns={columns} rows={rows} loading={orders.loading} error={orders.error} onRetry={orders.reload}
        searchText={(o) => o.id} searchPlaceholder="Search by order ID..." emptyMessage="No orders match your filters."
        filters={
          <>
            <Select className="w-40" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {["PENDING", "COMPLETED", "CANCELLED", "REFUNDED"].map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
            </Select>
            <Select className="w-40" value={payment} onChange={(e) => setPayment(e.target.value)}>
              <option value="">All payments</option>
              {["PAID", "UNPAID", "REFUNDED"].map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
            </Select>
            <Input type="date" className="w-40" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
          </>
        } />

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={`Order ${viewing?.id ?? ""}`} className="max-w-2xl">
        {viewing && (
          <div className="space-y-4 text-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <p><span className="text-muted">Date: </span>{formatDate(viewing.createdAt)}</p>
              <p><span className="text-muted">Status: </span><StatusBadge status={viewing.status} /></p>
              <p><span className="text-muted">Customer: </span>{customerOf(viewing.customerId)?.name ?? "Walk-in"}</p>
              <p><span className="text-muted">Phone: </span>{customerOf(viewing.customerId)?.phone || "-"}</p>
              <p><span className="text-muted">Cashier: </span>{employees.items.find((e) => e.id === viewing.cashierId)?.name ?? "-"}</p>
              <p><span className="text-muted">Payment: </span>{viewing.paymentMethod} · <StatusBadge status={viewing.paymentStatus} /></p>
            </div>
            <table className="w-full text-left">
              <thead className="text-xs uppercase text-muted"><tr><th className="py-2">Product</th><th>Qty</th><th>Price</th><th className="text-right">Total</th></tr></thead>
              <tbody>
                {viewing.items.map((i) => (
                  <tr key={i.productId} className="border-t border-border">
                    <td className="py-2">{i.name}</td><td>{i.quantity}</td><td>{formatCurrency(i.price)}</td>
                    <td className="text-right">{formatCurrency(i.price * i.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="ml-auto w-56 space-y-1">
              <p className="flex justify-between"><span className="text-muted">Subtotal</span>{formatCurrency(viewing.subtotal)}</p>
              <p className="flex justify-between"><span className="text-muted">Discount</span>-{formatCurrency(viewing.discount)}</p>
              <p className="flex justify-between"><span className="text-muted">Tax</span>{formatCurrency(viewing.tax)}</p>
              <p className="flex justify-between text-base font-semibold"><span>Total</span>{formatCurrency(viewing.total)}</p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {viewing.status === "PENDING" && <Button variant="outline" onClick={() => setChanging({ order: viewing, to: "CANCELLED" })}>Cancel order</Button>}
              {viewing.status === "COMPLETED" && <Button variant="outline" onClick={() => setChanging({ order: viewing, to: "REFUNDED" })}>Refund</Button>}
              <Button onClick={() => setPrinting(viewing)}><Printer size={16} /> Print receipt</Button>
            </div>
          </div>
        )}
      </Modal>
      <ConfirmDialog open={!!changing} destructive title={changing?.to === "REFUNDED" ? "Refund order" : "Cancel order"}
        message={`Mark ${changing?.order.id} as ${changing?.to.toLowerCase()}?`} confirmLabel="Confirm" onConfirm={applyChange} onCancel={() => setChanging(null)} />
      <ReceiptModal order={printing} customer={customerOf(printing?.customerId)} onClose={() => setPrinting(null)} />
    </>
  );
}
