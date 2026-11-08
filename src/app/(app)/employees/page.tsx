"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { z } from "zod";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, type Column } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { EntityForm, type FieldConfig } from "@/components/forms/entity-form";
import { useResource } from "@/hooks/use-resource";
import { employeeService } from "@/services";
import { formatDate } from "@/lib/utils";
import type { Employee, Role } from "@/types";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string(),
  role: z.enum(["ADMIN", "MANAGER", "CASHIER"]),
});
const fields: FieldConfig[] = [
  { name: "name", label: "Full name" },
  { name: "email", label: "Email", type: "email" },
  { name: "phone", label: "Phone", type: "tel" },
  {
    name: "role", label: "Role", type: "select",
    options: [
      { value: "ADMIN", label: "Admin" },
      { value: "MANAGER", label: "Manager" },
      { value: "CASHIER", label: "Cashier" },
    ],
  },
];

export default function EmployeesPage() {
  const employees = useResource(employeeService, "Employee");
  const [editing, setEditing] = useState<Employee | null>(null);
  const [creating, setCreating] = useState(false);
  const [toggling, setToggling] = useState<Employee | null>(null);

  const columns: Column<Employee>[] = [
    { key: "name", header: "Name", sortValue: (e) => e.name, render: (e) => <span className="font-medium">{e.name}</span> },
    { key: "email", header: "Email" },
    { key: "phone", header: "Phone", render: (e) => e.phone || "-" },
    { key: "role", header: "Role", sortValue: (e) => e.role, render: (e) => <Badge tone={e.role === "ADMIN" ? "blue" : e.role === "MANAGER" ? "yellow" : "gray"}>{e.role.charAt(0) + e.role.slice(1).toLowerCase()}</Badge> },
    { key: "hiredAt", header: "Hired", sortValue: (e) => e.hiredAt, render: (e) => formatDate(e.hiredAt).split(",")[0] },
    { key: "active", header: "Status", render: (e) => <Badge tone={e.active ? "green" : "red"}>{e.active ? "Active" : "Inactive"}</Badge> },
    {
      key: "actions", header: "",
      render: (e) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" aria-label="Edit" onClick={() => setEditing(e)}><Pencil size={14} /></Button>
          <Button variant="outline" size="sm" onClick={() => setToggling(e)}>{e.active ? "Deactivate" : "Activate"}</Button>
        </div>
      ),
    },
  ];

  async function save(v: Record<string, string>) {
    if (editing) await employees.update(editing.id, { ...v, role: v.role as Role });
    else await employees.create({ ...v, role: v.role as Role, active: true, hiredAt: new Date().toISOString() } as Omit<Employee, "id">);
    setEditing(null);
    setCreating(false);
  }

  return (
    <>
      <PageHeader title="Employees" description="Manage staff and roles"
        actions={<Button onClick={() => setCreating(true)}><Plus size={16} /> Add employee</Button>} />
      <DataTable columns={columns} rows={employees.items} loading={employees.loading} error={employees.error}
        onRetry={employees.reload} searchText={(e) => `${e.name} ${e.email} ${e.role}`} searchPlaceholder="Search employees..." />
      <Modal open={creating || !!editing} onClose={() => { setCreating(false); setEditing(null); }} title={editing ? "Edit employee" : "Add employee"}>
        <EntityForm key={editing?.id ?? "new"} fields={fields} schema={schema}
          initial={{ name: editing?.name ?? "", email: editing?.email ?? "", phone: editing?.phone ?? "", role: editing?.role ?? "CASHIER" }}
          submitLabel={editing ? "Save changes" : "Add employee"} onSubmit={save}
          onCancel={() => { setCreating(false); setEditing(null); }} />
      </Modal>
      <ConfirmDialog open={!!toggling} destructive={!!toggling?.active} title={toggling?.active ? "Deactivate employee" : "Activate employee"}
        message={`${toggling?.active ? "Deactivate" : "Activate"} ${toggling?.name}?`} confirmLabel={toggling?.active ? "Deactivate" : "Activate"}
        onConfirm={async () => { if (toggling) await employees.update(toggling.id, { active: !toggling.active }); setToggling(null); }}
        onCancel={() => setToggling(null)} />
    </>
  );
}
