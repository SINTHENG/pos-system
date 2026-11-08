"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

const schema = z
  .object({ password: z.string().min(8, "At least 8 characters"), confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords do not match" });
type V = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useForm<V>({ resolver: zodResolver(schema) });
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form
        onSubmit={handleSubmit(() => { toast.success("Password updated"); router.push("/login"); })}
        className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-card p-8 shadow-sm"
      >
        <h1 className="text-xl font-semibold">Reset password</h1>
        <input type="password" {...register("password")} placeholder="New password" className="h-10 w-full rounded-xl border border-border px-3 text-sm outline-none focus:border-primary" />
        {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
        <input type="password" {...register("confirm")} placeholder="Confirm password" className="h-10 w-full rounded-xl border border-border px-3 text-sm outline-none focus:border-primary" />
        {errors.confirm && <p className="text-xs text-red-500">{errors.confirm.message}</p>}
        <button className="h-10 w-full rounded-xl bg-primary text-sm font-medium text-primary-foreground">Update password</button>
        <p className="text-center text-sm"><Link href="/login" className="text-primary hover:underline">Back to login</Link></p>
      </form>
    </div>
  );
}
