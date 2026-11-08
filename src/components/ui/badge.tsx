import { cn } from "@/lib/utils";

const tones = {
  green: "bg-emerald-50 text-emerald-700",
  red: "bg-red-50 text-red-700",
  yellow: "bg-amber-50 text-amber-700",
  blue: "bg-blue-50 text-blue-700",
  gray: "bg-gray-100 text-gray-700",
} as const;

export function Badge({
  tone = "gray",
  children,
}: {
  tone?: keyof typeof tones;
  children: React.ReactNode;
}) {
  return (
    <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone])}>
      {children}
    </span>
  );
}

export function statusTone(status: string): keyof typeof tones {
  switch (status) {
    case "COMPLETED":
    case "PAID":
    case "RECEIVED":
    case "IN":
      return "green";
    case "PENDING":
    case "ORDERED":
    case "UNPAID":
    case "ADJUSTMENT":
      return "yellow";
    case "CANCELLED":
    case "OUT":
      return "red";
    case "REFUNDED":
      return "blue";
    default:
      return "gray";
  }
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={statusTone(status)}>{status.charAt(0) + status.slice(1).toLowerCase()}</Badge>;
}
