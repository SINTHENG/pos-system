"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";

export interface FieldConfig {
  name: string;
  label: string;
  type?: "text" | "email" | "tel" | "textarea" | "select" | "password";
  options?: { value: string; label: string }[];
}

/** Generic RHF + Zod form used by simple master-data modules (customers, suppliers, employees). */
export function EntityForm({
  fields,
  schema,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  fields: FieldConfig[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: z.ZodType<any, any>;
  initial: Record<string, string>;
  submitLabel: string;
  onSubmit: (values: Record<string, string>) => void | Promise<void>;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Record<string, string>>({ resolver: zodResolver(schema) as Resolver<Record<string, string>>, defaultValues: initial });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {fields.map((f) => (
        <Field key={f.name} label={f.label} error={errors[f.name]?.message as string | undefined}>
          {f.type === "textarea" ? (
            <Textarea {...register(f.name)} />
          ) : f.type === "select" ? (
            <Select {...register(f.name)}>
              {f.options?.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          ) : (
            <Input type={f.type ?? "text"} {...register(f.name)} />
          )}
        </Field>
      ))}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
