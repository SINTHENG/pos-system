"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Centered modal box with max-height and internal scrolling so it never cuts off */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-10 w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl transition-all my-auto",
          className
        )}
      >
        <div className="flex items-center justify-between border-b border-border/60 px-5 sm:px-6 py-4 flex-shrink-0">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-muted transition hover:bg-gray-100 hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 sm:px-6 py-4 flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
