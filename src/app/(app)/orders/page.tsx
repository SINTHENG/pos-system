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
import { customerService, orderService } from "@/services";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { Order } from "@/types";

export default function OrdersPage() {
  const orders = useResource(orderService, "Order");
  const customers = useResource(customerService, "Customer");

  const [status, setStatus] = useState("");
  const [payment, setPayment] = useState("");
  const [staff, setStaff] = useState("");
  const [date, setDate] = useState("");
  const [viewing, setViewing] = useState<Order | null>(null);
  const [printing, setPrinting] = useState<Order | null>(null);
  const [changing, setChanging] = useState<{ order: Order; to: "CANCELLED" | "REFUNDED" } | null>(null);

  const customerOf = (id?: string) => customers.items.find((c) => c.id === id);

  const rows = [...orders.items]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter(
      (o) =>
        (!status || o.status === status) &&
        (!payment || o.paymentStatus === payment) &&
        (!staff || o.cashierId === staff) &&
        (!date || o.createdAt.slice(0, 10) === date)
    );

  const columns: Column<Order>[] = [
    {
      key: "orderNumber",
      header: "Order #",
      sortValue: (o) => o.sequenceNumber ?? 0,
      render: (o) => (
        <div>
          <span className="font-bold text-gray-900">{o.orderNumber ?? o.id}</span>
          {o.orderNumber && <p className="text-[11px] text-muted">{o.id}</p>}
        </div>
      ),
    },
    {
      key: "cashier",
      header: "Staff Cashier",
      sortValue: (o) => o.cashierName ?? o.cashierId ?? "",
      render: (o) => {
        const isStaff1 = o.cashierId === "staff_1";
        return (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
              isStaff1 ? "bg-indigo-100 text-indigo-800" : "bg-emerald-100 text-emerald-800"
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                isStaff1 ? "bg-indigo-600" : "bg-emerald-600"
              )}
            />
            {o.cashierName ?? (isStaff1 ? "Staff 1" : "Staff 2")}
          </span>
        );
      },
    },
    { key: "createdAt", header: "Date", sortValue: (o) => o.createdAt, render: (o) => formatDate(o.createdAt) },
    { key: "customer", header: "Customer", render: (o) => customerOf(o.customerId)?.name ?? "Walk-in" },
    { key: "items", header: "Items", render: (o) => o.items.reduce((s, i) => s + i.quantity, 0) },
    { key: "payment", header: "Payment", render: (o) => o.paymentMethod },
    { key: "paymentStatus", header: "Paid?", render: (o) => <StatusBadge status={o.paymentStatus} /> },
    { key: "status", header: "Status", render: (o) => <StatusBadge status={o.status} /> },
    { key: "total", header: "Total", sortValue: (o) => o.total, render: (o) => formatCurrency(o.total) },
    {
      key: "actions",
      header: "",
      render: (o) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" aria-label="View" onClick={() => setViewing(o)}>
            <Eye size={14} />
          </Button>
          <Button variant="ghost" size="sm" aria-label="Print" onClick={() => setPrinting(o)}>
            <Printer size={14} />
          </Button>
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
      <PageHeader
        title="Orders & Staff Tracking"
        description="Continuous sequential order tracking shared across all staff members"
      />
      <DataTable
        columns={columns}
        rows={rows}
        loading={orders.loading}
        error={orders.error}
        onRetry={orders.reload}
        searchText={(o) => `${o.orderNumber ?? ""} ${o.id} ${o.cashierName ?? ""}`}
        searchPlaceholder="Search order #, ID, or staff..."
        emptyMessage="No orders match your filters."
        filters={
          <>
            <Select className="w-36" value={staff} onChange={(e) => setStaff(e.target.value)}>
              <option value="">All Staff</option>
              <option value="staff_1">Staff 1</option>
              <option value="staff_2">Staff 2</option>
            </Select>
            <Select className="w-36" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {["PENDING", "COMPLETED", "CANCELLED", "REFUNDED"].map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>
            <Select className="w-36" value={payment} onChange={(e) => setPayment(e.target.value)}>
              <option value="">All payments</option>
              {["PAID", "UNPAID", "REFUNDED"].map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>
            <Input
              type="date"
              className="w-36"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Date"
            />
          </>
        }
      />

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={`Order ${viewing?.orderNumber ? `${viewing.orderNumber} (${viewing.id})` : viewing?.id ?? ""}`}
        className="max-w-2xl"
      >
        {viewing && (
          <div className="space-y-4 text-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <p>
                <span className="text-muted">Order Number: </span>
                <strong className="text-foreground">{viewing.orderNumber ?? viewing.id}</strong>
              </p>
              <p>
                <span className="text-muted">Cashier: </span>
                <span className="font-semibold text-primary">
                  {viewing.cashierName ?? (viewing.cashierId === "staff_1" ? "Staff 1" : "Staff 2")}
                </span>
              </p>
              <p>
                <span className="text-muted">Date: </span>
                {formatDate(viewing.createdAt)}
              </p>
              <p>
                <span className="text-muted">Status: </span>
                <StatusBadge status={viewing.status} />
              </p>
              <p>
                <span className="text-muted">Customer: </span>
                {customerOf(viewing.customerId)?.name ?? "Walk-in Customer"}
              </p>
              <p>
                <span className="text-muted">Payment: </span>
                {viewing.paymentMethod} · <StatusBadge status={viewing.paymentStatus} />
              </p>
              {viewing.shiftId && (
                <p className="sm:col-span-2 text-xs text-muted">
                  Shift Reference: <span className="font-mono">{viewing.shiftId}</span>
                </p>
              )}
            </div>

            <table className="w-full text-left">
              <thead className="text-xs uppercase text-muted">
                <tr>
                  <th className="py-2">Product</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {viewing.items.map((i) => (
                  <tr key={i.productId} className="border-t border-border">
                    <td className="py-2">{i.name}</td>
                    <td>{i.quantity}</td>
                    <td>{formatCurrency(i.price)}</td>
                    <td className="text-right">{formatCurrency(i.price * i.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="ml-auto w-56 space-y-1">
              <p className="flex justify-between">
                <span className="text-muted">Subtotal</span>
                {formatCurrency(viewing.subtotal)}
              </p>
              <p className="flex justify-between">
                <span className="text-muted">Discount</span>-{formatCurrency(viewing.discount)}
              </p>
              <p className="flex justify-between">
                <span className="text-muted">Tax</span>
                {formatCurrency(viewing.tax)}
              </p>
              <p className="flex justify-between text-base font-semibold">
                <span>Total</span>
                {formatCurrency(viewing.total)}
              </p>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3">
              {viewing.status === "PENDING" && (
                <Button
                  variant="outline"
                  onClick={() => setChanging({ order: viewing, to: "CANCELLED" })}
                >
                  Cancel order
                </Button>
              )}
              {viewing.status === "COMPLETED" && (
                <Button
                  variant="outline"
                  onClick={() => setChanging({ order: viewing, to: "REFUNDED" })}
                >
                  Refund
                </Button>
              )}
              <Button onClick={() => setPrinting(viewing)}>
                <Printer size={16} /> Print receipt
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!changing}
        destructive
        title={changing?.to === "REFUNDED" ? "Refund order" : "Cancel order"}
        message={
          changing?.to === "CANCELLED"
            ? `Cancel order ${changing.order.orderNumber ?? changing.order.id}? The order number will remain reserved and will NOT be reused.`
            : `Mark ${changing?.order.id} as refunded?`
        }
        confirmLabel="Confirm"
        onConfirm={applyChange}
        onCancel={() => setChanging(null)}
      />

      <ReceiptModal
        order={printing}
        customer={customerOf(printing?.customerId)}
        onClose={() => setPrinting(null)}
      />
    </>
  );
}
