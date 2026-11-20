"use client";

import { useState } from "react";
import { LogIn, LogOut, RefreshCw, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useShiftStore } from "@/store/shift-store";
import { ShiftModal } from "./shift-modal";
import { cn, formatCurrency } from "@/lib/utils";

export function ShiftBadge({ className }: { className?: string }) {
  const activeShift = useShiftStore((s) => s.activeShift);
  const [modalMode, setModalMode] = useState<"open" | "close" | "switch" | null>(null);

  return (
    <>
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 rounded-xl border px-3 py-1.5 text-xs shadow-sm transition",
          activeShift
            ? "border-emerald-200 bg-emerald-50/70 text-emerald-950"
            : "border-amber-200 bg-amber-50/80 text-amber-950",
          className
        )}
      >
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            {activeShift && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={cn(
                "relative inline-flex h-2.5 w-2.5 rounded-full",
                activeShift ? "bg-emerald-500" : "bg-amber-500"
              )}
            />
          </span>

          {activeShift ? (
            <div className="flex items-center gap-1.5 font-medium">
              <UserCheck size={14} className="text-emerald-700" />
              <span>
                <strong className="text-emerald-900">{activeShift.staffName}</strong> on duty
              </span>
              <span className="hidden text-emerald-700/80 sm:inline">
                · {activeShift.totalOrders ?? 0} orders ({formatCurrency(activeShift.totalSales ?? 0)})
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 font-medium text-amber-900">
              <UserX size={14} className="text-amber-700" />
              <span>No Active Shift</span>
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1">
          {activeShift ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-emerald-900 hover:bg-emerald-200/60"
                onClick={() => setModalMode("switch")}
                title="Switch to another staff member"
              >
                <RefreshCw size={12} className="mr-1" /> Switch
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 border-emerald-300 bg-white px-2.5 text-xs text-emerald-800 hover:bg-emerald-100"
                onClick={() => setModalMode("close")}
              >
                <LogOut size={12} className="mr-1 text-red-600" /> Close Shift
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              className="h-7 bg-amber-600 px-3 text-xs text-white hover:bg-amber-700"
              onClick={() => setModalMode("open")}
            >
              <LogIn size={12} className="mr-1" /> Open Shift
            </Button>
          )}
        </div>
      </div>

      <ShiftModal
        open={modalMode !== null}
        mode={modalMode ?? "open"}
        onClose={() => setModalMode(null)}
      />
    </>
  );
}
