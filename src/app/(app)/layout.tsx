import { AppShell } from "@/components/layout/app-shell";

// Client-side authenticated layout conditionally renders children after hydration
export const instant = false;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
