"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { Receipt } from "@/components/pos/receipt";
import { useSettingsStore } from "@/store/settings-store";
import { cn } from "@/lib/utils";
import { uploadImage } from "@/lib/upload";
import type { Order } from "@/types";

const schema = z.object({
  storeName: z.string().min(2, "Store name is required"),
  address: z.string(),
  phone: z.string(),
  email: z.string().email("Invalid email").or(z.literal("")),
  currency: z.string().min(3),
  taxEnabled: z.boolean(),
  taxRate: z.number({ error: "Enter a number" }).min(0).max(100, "Max 100%"),
  receiptHeader: z.string(),
  receiptFooter: z.string(),
  showReceiptLogo: z.boolean(),
});
type V = z.infer<typeof schema>;

const SAMPLE: Order = {
  id: "ORD-SAMPLE", cashierId: "x", paymentMethod: "CASH", paymentStatus: "PAID", status: "COMPLETED", createdAt: new Date().toISOString(),
  items: [{ productId: "a", name: "Iced Latte", price: 3.5, quantity: 2 }, { productId: "b", name: "Croissant", price: 2.5, quantity: 1 }],
  subtotal: 9.5, discount: 0, tax: 0.95, total: 10.45,
};

export default function SettingsPage() {
  const { settings, update } = useSettingsStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [logo, setLogo] = useState(settings.logoUrl);
  const [tab, setTab] = useState<"store" | "receipt" | "password">("store");

  const { register, handleSubmit, watch, formState: { errors, isDirty } } = useForm<V>({
    resolver: zodResolver(schema),
    defaultValues: { ...settings },
  });
  const live = watch();

  async function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      setLogo(await uploadImage(f));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  }

  function save(v: V) {
    update({ ...v, logoUrl: logo });
    toast.success("Settings saved");
  }

  const pw = useForm<{ current: string; next: string; confirm: string }>({
    resolver: zodResolver(
      z.object({ current: z.string().min(1, "Required"), next: z.string().min(8, "At least 8 characters"), confirm: z.string() })
        .refine((v) => v.next === v.confirm, { path: ["confirm"], message: "Passwords do not match" }),
    ),
  });

  return (
    <>
      <PageHeader title="Settings" description="Store, tax, receipt and security" />
      <div className="mb-4 inline-flex rounded-xl border border-border bg-card p-1 text-sm">
        {([["store", "Store & tax"], ["receipt", "Receipt"], ["password", "Password"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={cn("rounded-lg px-4 py-1.5", tab === id ? "bg-primary text-primary-foreground" : "text-muted")}>{label}</button>
        ))}
      </div>

      {tab !== "password" && (
        <form onSubmit={handleSubmit(save)} className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            {tab === "store" && (
              <>
                <Card className="space-y-4">
                  <CardTitle>Store information</CardTitle>
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-gray-50 text-xs text-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {logo ? <img src={logo} alt="Logo" className="h-full w-full object-cover" /> : "Logo"}
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" hidden onChange={onLogo} />
                    <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Upload size={14} /> Upload logo</Button>
                  </div>
                  <Field label="Store name" error={errors.storeName?.message}><Input {...register("storeName")} /></Field>
                  <Field label="Address"><Textarea {...register("address")} /></Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Phone"><Input {...register("phone")} /></Field>
                    <Field label="Email" error={errors.email?.message}><Input {...register("email")} /></Field>
                  </div>
                </Card>
                <Card className="space-y-4">
                  <CardTitle>Currency & tax</CardTitle>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Currency">
                      <Select {...register("currency")}>
                        {["USD", "KHR", "EUR", "GBP", "THB"].map((c) => <option key={c}>{c}</option>)}
                      </Select>
                    </Field>
                    <Field label="Tax rate (%)" error={errors.taxRate?.message}>
                      <Input type="number" step="0.1" {...register("taxRate", { valueAsNumber: true })} />
                    </Field>
                  </div>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register("taxEnabled")} /> Apply tax to sales</label>
                </Card>
              </>
            )}
            {tab === "receipt" && (
              <Card className="space-y-4">
                <CardTitle>Receipt settings</CardTitle>
                <Field label="Header text"><Input {...register("receiptHeader")} /></Field>
                <Field label="Footer text"><Input {...register("receiptFooter")} /></Field>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register("showReceiptLogo")} /> Show logo on receipt</label>
              </Card>
            )}
            <Button type="submit" disabled={!isDirty && logo === settings.logoUrl}>Save settings</Button>
          </div>
          <Card className="h-fit">
            <CardTitle>Receipt preview</CardTitle>
            <Receipt order={SAMPLE} settings={{ ...settings, ...live, logoUrl: logo }} />
          </Card>
        </form>
      )}

      {tab === "password" && (
        <Card className="max-w-md">
          <CardTitle>Change password</CardTitle>
          <form onSubmit={pw.handleSubmit(() => { toast.success("Password changed (demo - no backend yet)"); pw.reset(); })} className="space-y-4">
            <Field label="Current password" error={pw.formState.errors.current?.message}><Input type="password" {...pw.register("current")} /></Field>
            <Field label="New password" error={pw.formState.errors.next?.message}><Input type="password" {...pw.register("next")} /></Field>
            <Field label="Confirm new password" error={pw.formState.errors.confirm?.message}><Input type="password" {...pw.register("confirm")} /></Field>
            <Button type="submit">Update password</Button>
          </form>
        </Card>
      )}
    </>
  );
}
