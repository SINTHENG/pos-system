"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input } from "@/components/ui/fields";
import { useAuthStore } from "@/store/auth-store";

const schema = z.object({ name: z.string().min(2, "Name is required"), email: z.string().email("Invalid email") });

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const { register, handleSubmit, formState: { errors } } = useForm<{ name: string; email: string }>({
    resolver: zodResolver(schema),
    defaultValues: { name: user?.name ?? "", email: user?.email ?? "" },
  });

  if (!user) return null;
  return (
    <>
      <PageHeader title="My profile" description="Your account details" />
      <Card className="max-w-lg space-y-4">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-semibold text-primary">{user.name.charAt(0)}</span>
          <div>
            <p className="font-semibold">{user.name}</p>
            <Badge tone="blue">{user.role.charAt(0) + user.role.slice(1).toLowerCase()}</Badge>
          </div>
        </div>
        <form
          onSubmit={handleSubmit((v) => {
            useAuthStore.setState({ user: { ...user, ...v } });
            toast.success("Profile updated");
          })}
          className="space-y-4"
        >
          <Field label="Full name" error={errors.name?.message}><Input {...register("name")} /></Field>
          <Field label="Email" error={errors.email?.message}><Input {...register("email")} /></Field>
          <Button type="submit">Save profile</Button>
        </form>
      </Card>
    </>
  );
}
