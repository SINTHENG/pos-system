"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

const schema = z.object({ email: z.string().email("Enter a valid email") });

export default function ForgotPasswordPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<{ email: string }>({ resolver: zodResolver(schema) });
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form
        onSubmit={handleSubmit(() => toast.success("If the account exists, a reset link was sent."))}
        className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-card p-8 shadow-sm"
      >
        <h1 className="text-xl font-semibold">Forgot password</h1>
        <input {...register("email")} placeholder="you@example.com" className="h-10 w-full rounded-xl border border-border px-3 text-sm outline-none focus:border-primary" />
        {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
        <button className="h-10 w-full rounded-xl bg-primary text-sm font-medium text-primary-foreground">Send reset link</button>
        <p className="text-center text-sm"><Link href="/reset-password" className="text-primary hover:underline">I have a reset code</Link> · <Link href="/login" className="text-primary hover:underline">Back to login</Link></p>
      </form>
    </div>
  );
}
