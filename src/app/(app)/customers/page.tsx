"use client";

import { useState } from "react";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, type Column } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { EntityForm, type FieldConfig } from "@/components/forms/entity-form";
import { useResource } from "@/hooks/use-resource";
import { customerService, orderService } from "@/services";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Customer } from "@/types";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email").or(z.literal("")),
  phone: z.string(),
  address: z.string(),
});
const fields: FieldConfig[] = [
  { name: "name", label: "Full name" },
  { name: "email", label: "Email", type: "email" },
  { name: "phone", label: "Phone", type: "tel" },
  { name: "address", label: "Address", type: "textarea" },
];

export default function CustomersPage() {
  const customers = useResource(customerService, "Customer");
  const orders = useResource(orderService, "Order");
  const [editing, setEditing] = useState<Customer | null>(null);
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState<Customer | null>(null);

  const history = (id: string) => orders.items.filter((o) => o.customerId === id);
  const spent = (id: string) => history(id).filter((o) => o.status === "COMPLETED").reduce((s, o) => s + o.total, 0);

  const columns: Column<Customer>[] = [
    { key: "name", header: "Name", sortValue: (c) => c.name, render: (c) => <span className="font-medium">{c.name}</span> },
    { key: "email", header: "Email", render: (c) => c.email || "-" },
    { key: "phone", header: "Phone", render: (c) => c.phone || "-" },
    { key: "orders", header: "Orders", sortValue: (c) => history(c.id).length, render: (c) => history(c.id).length },
    { key: "spent", header: "Total spending", sortValue: (c) => spent(c.id), render: (c) => formatCurrency(spent(c.id)) },
    {
      key: "actions",
      header: "",
      render: (c) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" aria-label="View" onClick={() => setViewing(c)}><Eye size={14} /></Button>
          <Button variant="ghost" size="sm" aria-label="Edit" onClick={() => setEditing(c)}><Pencil size={14} /></Button>
          <Button variant="ghost" size="sm" aria-label="Delete" disabled={c.id === "cus_1"} onClick={() => setDeleting(c)}><Trash2 size={14} className="text-red-500" /></Button>
        </div>
      ),
    },
  ];

  async function save(v: Record<string, string>) {
    if (editing) await customers.update(editing.id, v);
    else await customers.create({ ...v, createdAt: new Date().toISOString() } as Omit<Customer, "id">);
    setEditing(null);
    setCreating(false);
  }

  return (
    <>
      <PageHeader title="Customers" description="Customer list and purchase history"
        actions={<Button onClick={() => setCreating(true)}><Plus size={16} /> Add customer</Button>} />
      <DataTable columns={columns} rows={customers.items} loading={customers.loading || orders.loading} error={customers.error}
        onRetry={customers.reload} searchText={(c) => `${c.name} ${c.email ?? ""} ${c.phone ?? ""}`} searchPlaceholder="Search customers..." />

      <Modal open={creating || !!editing} onClose={() => { setCreating(false); setEditing(null); }} title={editing ? "Edit customer" : "Add customer"}>
        <EntityForm key={editing?.id ?? "new"} fields={fields} schema={schema}
          initial={{ name: editing?.name ?? "", email: editing?.email ?? "", phone: editing?.phone ?? "", address: editing?.address ?? "" }}
          submitLabel={editing ? "Save changes" : "Add customer"} onSubmit={save}
          onCancel={() => { setCreating(false); setEditing(null); }} />
      </Modal>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Customer details" className="max-w-2xl">
        {viewing && (
          <div className="space-y-4 text-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <p><span className="text-muted">Name: </span>{viewing.name}</p>
              <p><span className="text-muted">Email: </span>{viewing.email || "-"}</p>
              <p><span className="text-muted">Phone: </span>{viewing.phone || "-"}</p>
              <p><span className="text-muted">Address: </span>{viewing.address || "-"}</p>
              <p><span className="text-muted">Customer since: </span>{formatDate(viewing.createdAt)}</p>
              <p><span className="text-muted">Total spending: </span><span className="font-semibold">{formatCurrency(spent(viewing.id))}</span></p>
            </div>
            <h3 className="font-semibold">Purchase history</h3>
            {history(viewing.id).length === 0 ? (
              <p className="text-muted">No purchases yet.</p>
            ) : (
              <ul className="max-h-64 divide-y divide-border overflow-y-auto">
                {history(viewing.id).map((o) => (
                  <li key={o.id} className="flex items-center justify-between py-2">
                    <span>{o.id} <span className="text-xs text-muted">{formatDate(o.createdAt)}</span></span>
                    <span className="flex items-center gap-3"><StatusBadge status={o.status} />{formatCurrency(o.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Modal>
      <ConfirmDialog open={!!deleting} destructive title="Delete customer" message={`Delete "${deleting?.name}"?`} confirmLabel="Delete"
        onConfirm={async () => { if (deleting) await customers.remove(deleting.id); setDeleting(null); }} onCancel={() => setDeleting(null)} />
    </>
  );
}
