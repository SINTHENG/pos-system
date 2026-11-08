"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { uploadImage } from "@/lib/upload";
import type { Category, Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { ProductImage } from "./product-image";

const schema = z.object({
  sku: z.string().min(1, "SKU is required"),
  barcode: z.string().min(1, "Barcode is required"),
  name: z.string().min(2, "Name is required"),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Select a category"),
  purchasePrice: z.number({ error: "Enter a number" }).min(0, "Must be 0 or more"),
  sellingPrice: z.number({ error: "Enter a number" }).min(0, "Must be 0 or more"),
  stock: z.number({ error: "Enter a number" }).int("Whole number").min(0, "Must be 0 or more"),
  minStock: z.number({ error: "Enter a number" }).int("Whole number").min(0, "Must be 0 or more"),
  imageUrl: z.string().optional(),
});
export type ProductFormValues = z.infer<typeof schema>;

export function ProductForm({
  initial,
  categories,
  submitting,
  onSubmit,
  onCancel,
}: {
  initial?: Product;
  categories: Category[];
  submitting?: boolean;
  onSubmit: (values: ProductFormValues) => void;
  onCancel: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial
      ? { ...initial }
      : { sku: "", barcode: "", name: "", description: "", categoryId: "", purchasePrice: 0, sellingPrice: 0, stock: 0, minStock: 5, imageUrl: "" },
  });
  const imageUrl = watch("imageUrl");
  const name = watch("name");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file");
    setUploading(true);
    try {
      setValue("imageUrl", await uploadImage(file), { shouldDirty: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex items-center gap-4">
        <ProductImage name={name || "P"} imageUrl={imageUrl} className="h-20 w-20 rounded-2xl" />
        <div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
          <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />} {uploading ? "Uploading..." : "Upload image"}
          </Button>
          {imageUrl && (
            <button type="button" className="ml-2 text-xs text-red-500" onClick={() => setValue("imageUrl", "")}>
              Remove
            </button>
          )}
          <p className="mt-1 text-xs text-muted">PNG, JPEG, WebP or GIF, up to 5MB.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Product name" error={errors.name?.message}>
          <Input {...register("name")} />
        </Field>
        <Field label="Category" error={errors.categoryId?.message}>
          <Select {...register("categoryId")}>
            <option value="">Select...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="SKU" error={errors.sku?.message}>
          <Input {...register("sku")} />
        </Field>
        <Field label="Barcode" error={errors.barcode?.message}>
          <Input {...register("barcode")} />
        </Field>
        <Field label="Purchase price" error={errors.purchasePrice?.message}>
          <Input type="number" step="0.01" {...register("purchasePrice", { valueAsNumber: true })} />
        </Field>
        <Field label="Selling price" error={errors.sellingPrice?.message}>
          <Input type="number" step="0.01" {...register("sellingPrice", { valueAsNumber: true })} />
        </Field>
        <Field label="Stock quantity" error={errors.stock?.message}>
          <Input type="number" {...register("stock", { valueAsNumber: true })} />
        </Field>
        <Field label="Minimum stock level" error={errors.minStock?.message}>
          <Input type="number" {...register("minStock", { valueAsNumber: true })} />
        </Field>
      </div>
      <Field label="Description">
        <Textarea {...register("description")} />
      </Field>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || uploading}>
          {initial ? "Save changes" : "Add product"}
        </Button>
      </div>
    </form>
  );
}
