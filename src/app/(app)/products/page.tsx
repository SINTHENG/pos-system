"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, type Column } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/fields";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { ProductForm, type ProductFormValues } from "@/components/products/product-form";
import { ProductImage } from "@/components/products/product-image";
import { useResource } from "@/hooks/use-resource";
import { categoryService, productService } from "@/services";
import { stockStatus } from "@/lib/analytics";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/types";

export default function ProductsPage() {
  const products = useResource(productService, "Product");
  const categories = useResource(categoryService, "Category");
  const [category, setCategory] = useState("");
  const [stock, setStock] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);
  const [initialSearch] = useState(() =>
    typeof window === "undefined" ? "" : (new URLSearchParams(window.location.search).get("q") ?? ""),
  );

  const catName = (id: string) => categories.items.find((c) => c.id === id)?.name ?? "-";
  const rows = products.items.filter(
    (p) => (!category || p.categoryId === category) && (!stock || stockStatus(p) === stock),
  );

  const columns: Column<Product>[] = [
    {
      key: "name",
      header: "Product",
      sortValue: (p) => p.name,
      render: (p) => (
        <div className="flex items-center gap-3">
          <ProductImage name={p.name} imageUrl={p.imageUrl} className="h-10 w-10 rounded-xl text-base" />
          <div>
            <p className="font-medium">{p.name}</p>
            <p className="text-xs text-muted">{p.sku}</p>
          </div>
        </div>
      ),
    },
    { key: "barcode", header: "Barcode" },
    { key: "category", header: "Category", sortValue: (p) => catName(p.categoryId), render: (p) => catName(p.categoryId) },
    { key: "purchasePrice", header: "Cost", sortValue: (p) => p.purchasePrice, render: (p) => formatCurrency(p.purchasePrice) },
    { key: "sellingPrice", header: "Price", sortValue: (p) => p.sellingPrice, render: (p) => formatCurrency(p.sellingPrice) },
    { key: "stock", header: "Stock", sortValue: (p) => p.stock },
    {
      key: "status",
      header: "Status",
      render: (p) => {
        const s = stockStatus(p);
        return s === "OUT" ? <Badge tone="red">Out of stock</Badge> : s === "LOW" ? <Badge tone="yellow">Low stock</Badge> : <Badge tone="green">In stock</Badge>;
      },
    },
    {
      key: "actions",
      header: "",
      render: (p) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" aria-label="Edit" onClick={() => setEditing(p)}>
            <Pencil size={14} />
          </Button>
          <Button variant="ghost" size="sm" aria-label="Delete" onClick={() => setDeleting(p)}>
            <Trash2 size={14} className="text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  async function save(values: ProductFormValues) {
    setBusy(true);
    if (editing) await products.update(editing.id, values);
    else await products.create(values);
    setBusy(false);
    setEditing(null);
    setCreating(false);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    await products.remove(deleting.id);
    setBusy(false);
    setDeleting(null);
  }

  return (
    <>
      <PageHeader
        title="Products"
        description="Manage your product catalog"
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus size={16} /> Add product
          </Button>
        }
      />
      <DataTable
        columns={columns}
        rows={rows}
        loading={products.loading}
        error={products.error}
        onRetry={products.reload}
        initialSearch={initialSearch}
        searchText={(p) => `${p.name} ${p.sku} ${p.barcode}`}
        searchPlaceholder="Search name, SKU, barcode..."
        emptyMessage="No products match your filters."
        filters={
          <>
            <Select className="w-44" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {categories.items.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select className="w-40" value={stock} onChange={(e) => setStock(e.target.value)}>
              <option value="">All stock</option>
              <option value="OK">In stock</option>
              <option value="LOW">Low stock</option>
              <option value="OUT">Out of stock</option>
            </Select>
          </>
        }
      />

      <Modal
        open={creating || !!editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? "Edit product" : "Add product"}
        className="max-w-2xl"
      >
        <ProductForm
          key={editing?.id ?? "new"}
          initial={editing ?? undefined}
          categories={categories.items}
          submitting={busy}
          onSubmit={save}
          onCancel={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      </Modal>
      <ConfirmDialog
        open={!!deleting}
        destructive
        loading={busy}
        title="Delete product"
        message={`Delete "${deleting?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
