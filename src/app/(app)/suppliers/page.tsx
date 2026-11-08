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
import { purchaseService, supplierService } from "@/services";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Supplier } from "@/types";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  contactPerson: z.string(),
  email: z.string().email("Invalid email").or(z.literal("")),
  phone: z.string(),
  address: z.string(),
});
const fields: FieldConfig[] = [
  { name: "name", label: "Company name" },
  { name: "contactPerson", label: "Contact person" },
  { name: "email", label: "Email", type: "email" },
  { name: "phone", label: "Phone", type: "tel" },
  { name: "address", label: "Address", type: "textarea" },
];

export default function SuppliersPage() {
  const suppliers = useResource(supplierService, "Supplier");
  const purchases = useResource(purchaseService, "Purchase");
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState<Supplier | null>(null);

  const history = (id: string) => purchases.items.filter((p) => p.supplierId === id);

  const columns: Column<Supplier>[] = [
    { key: "name", header: "Supplier", sortValue: (s) => s.name, render: (s) => <span className="font-medium">{s.name}</span> },
    { key: "contactPerson", header: "Contact", render: (s) => s.contactPerson || "-" },
    { key: "email", header: "Email", render: (s) => s.email || "-" },
    { key: "phone", header: "Phone", render: (s) => s.phone || "-" },
    { key: "orders", header: "Purchases", sortValue: (s) => history(s.id).length, render: (s) => history(s.id).length },
    {
      key: "actions", header: "",
      render: (s) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" aria-label="View" onClick={() => setViewing(s)}><Eye size={14} /></Button>
          <Button variant="ghost" size="sm" aria-label="Edit" onClick={() => setEditing(s)}><Pencil size={14} /></Button>
          <Button variant="ghost" size="sm" aria-label="Delete" onClick={() => setDeleting(s)}><Trash2 size={14} className="text-red-500" /></Button>
        </div>
      ),
    },
  ];

  async function save(v: Record<string, string>) {
    if (editing) await suppliers.update(editing.id, v);
    else await suppliers.create(v as Omit<Supplier, "id">);
    setEditing(null);
    setCreating(false);
  }

  return (
    <>
      <PageHeader title="Suppliers" description="Vendors you purchase stock from"
        actions={<Button onClick={() => setCreating(true)}><Plus size={16} /> Add supplier</Button>} />
      <DataTable columns={columns} rows={suppliers.items} loading={suppliers.loading} error={suppliers.error}
        onRetry={suppliers.reload} searchText={(s) => `${s.name} ${s.contactPerson ?? ""} ${s.email ?? ""}`} searchPlaceholder="Search suppliers..." />

      <Modal open={creating || !!editing} onClose={() => { setCreating(false); setEditing(null); }} title={editing ? "Edit supplier" : "Add supplier"}>
        <EntityForm key={editing?.id ?? "new"} fields={fields} schema={schema}
          initial={{ name: editing?.name ?? "", contactPerson: editing?.contactPerson ?? "", email: editing?.email ?? "", phone: editing?.phone ?? "", address: editing?.address ?? "" }}
          submitLabel={editing ? "Save changes" : "Add supplier"} onSubmit={save}
          onCancel={() => { setCreating(false); setEditing(null); }} />
      </Modal>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.name ?? "Supplier"} className="max-w-xl">
        {viewing && (
          <div className="space-y-4 text-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <p><span className="text-muted">Contact: </span>{viewing.contactPerson || "-"}</p>
              <p><span className="text-muted">Email: </span>{viewing.email || "-"}</p>
              <p><span className="text-muted">Phone: </span>{viewing.phone || "-"}</p>
              <p><span className="text-muted">Address: </span>{viewing.address || "-"}</p>
            </div>
            <h3 className="font-semibold">Purchase history</h3>
            {history(viewing.id).length === 0 ? <p className="text-muted">No purchases yet.</p> : (
              <ul className="divide-y divide-border">
                {history(viewing.id).map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2">
                    <span>{p.id} <span className="text-xs text-muted">{formatDate(p.createdAt)}</span></span>
                    <span className="flex items-center gap-3"><StatusBadge status={p.status} />{formatCurrency(p.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Modal>
      <ConfirmDialog open={!!deleting} destructive title="Delete supplier" message={`Delete "${deleting?.name}"?`} confirmLabel="Delete"
        onConfirm={async () => { if (deleting) await suppliers.remove(deleting.id); setDeleting(null); }} onCancel={() => setDeleting(null)} />
    </>
  );
}
