"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Store } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(4, "Password must be at least 4 characters"),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "admin@pos.example", password: "password" },
  });

  function onSubmit(values: FormValues) {
    const res = login(values.email, values.password);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Welcome back!");
    const role = useAuthStore.getState().user?.role;
    router.replace(role === "CASHIER" ? "/pos" : "/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Store />
          </span>
          <h1 className="text-xl font-semibold">Sign in to Modern POS</h1>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input {...register("email")} className="h-10 w-full rounded-xl border border-border px-3 text-sm outline-none focus:border-primary" />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Password</label>
            <input type="password" {...register("password")} className="h-10 w-full rounded-xl border border-border px-3 text-sm outline-none focus:border-primary" />
            {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
          </div>
          <div className="text-right text-sm">
            <Link href="/forgot-password" className="text-primary hover:underline">Forgot password?</Link>
          </div>
          <button disabled={isSubmitting} className="h-10 w-full rounded-xl bg-primary text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
            Sign in
          </button>
        </form>
        <div className="mt-6 border-t border-border pt-4 text-xs text-muted">
          <p className="mb-2">Demo accounts (any password with 4+ chars):</p>
          <div className="flex flex-wrap gap-2">
            {["admin", "manager", "cashier"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setValue("email", `${r}@pos.example`)}
                className="rounded-lg border border-border px-2.5 py-1 capitalize hover:bg-gray-50"
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
