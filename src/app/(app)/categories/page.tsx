"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, type Column } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/fields";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { useResource } from "@/hooks/use-resource";
import { categoryService, productService } from "@/services";
import type { Category } from "@/types";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().optional(),
});
type V = z.infer<typeof schema>;

function CategoryForm({ initial, onSubmit, onCancel }: { initial?: Category; onSubmit: (v: V) => void; onCancel: () => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<V>({
    resolver: zodResolver(schema),
    defaultValues: { name: initial?.name ?? "", description: initial?.description ?? "" },
  });
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Name" error={errors.name?.message}>
        <Input {...register("name")} />
      </Field>
      <Field label="Description">
        <Textarea {...register("description")} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{initial ? "Save changes" : "Create category"}</Button>
      </div>
    </form>
  );
}

export default function CategoriesPage() {
  const categories = useResource(categoryService, "Category");
  const products = useResource(productService, "Product");
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const count = (id: string) => products.items.filter((p) => p.categoryId === id).length;

  const columns: Column<Category>[] = [
    { key: "name", header: "Name", sortValue: (c) => c.name, render: (c) => <span className="font-medium">{c.name}</span> },
    { key: "description", header: "Description", render: (c) => c.description || "-" },
    { key: "count", header: "Products", sortValue: (c) => count(c.id), render: (c) => count(c.id) },
    {
      key: "actions",
      header: "",
      render: (c) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" aria-label="Edit" onClick={() => setEditing(c)}><Pencil size={14} /></Button>
          <Button variant="ghost" size="sm" aria-label="Delete" onClick={() => setDeleting(c)}><Trash2 size={14} className="text-red-500" /></Button>
        </div>
      ),
    },
  ];

  async function save(v: V) {
    if (editing) await categories.update(editing.id, v);
    else await categories.create(v);
    setEditing(null);
    setCreating(false);
  }

  async function confirmDelete() {
    if (!deleting) return;
    if (count(deleting.id) > 0) {
      toast.error("Cannot delete a category that still has products");
    } else {
      await categories.remove(deleting.id);
    }
    setDeleting(null);
  }

  return (
    <>
      <PageHeader
        title="Categories"
        description="Organize products into categories"
        actions={<Button onClick={() => setCreating(true)}><Plus size={16} /> Add category</Button>}
      />
      <DataTable
        columns={columns}
        rows={categories.items}
        loading={categories.loading}
        error={categories.error}
        onRetry={categories.reload}
        searchText={(c) => `${c.name} ${c.description ?? ""}`}
        searchPlaceholder="Search categories..."
      />
      <Modal
        open={creating || !!editing}
        onClose={() => { setCreating(false); setEditing(null); }}
        title={editing ? "Edit category" : "Add category"}
      >
        <CategoryForm
          key={editing?.id ?? "new"}
          initial={editing ?? undefined}
          onSubmit={save}
          onCancel={() => { setCreating(false); setEditing(null); }}
        />
      </Modal>
      <ConfirmDialog
        open={!!deleting}
        destructive
        title="Delete category"
        message={`Delete "${deleting?.name}"?`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
