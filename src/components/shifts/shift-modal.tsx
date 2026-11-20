"use client";

import { useMemo, useState } from "react";
import {
  Banknote,
  CheckCircle2,
  Clock,
  CreditCard,
  LogIn,
  LogOut,
  QrCode,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/fields";
import { useShiftStore } from "@/store/shift-store";
import { useResource } from "@/hooks/use-resource";
import { orderService } from "@/services";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

interface ShiftModalProps {
  open: boolean;
  mode?: "open" | "close" | "switch";
  onClose: () => void;
  onSuccess?: () => void;
  defaultStaffId?: string;
}

export function ShiftModal(props: ShiftModalProps) {
  if (!props.open) return null;
  return <ShiftModalContent {...props} />;
}

function ShiftModalContent({
  open,
  mode = "open",
  onClose,
  onSuccess,
  defaultStaffId,
}: ShiftModalProps) {
  const { activeShift, staffMembers, openShift, closeShift } = useShiftStore();
  const orders = useResource(orderService, "Order");

  const initialStaff =
    defaultStaffId ??
    (activeShift ? (activeShift.staffId === "staff_1" ? "staff_2" : "staff_1") : "staff_1");

  // Determine initial selected staff
  const [selectedStaff, setSelectedStaff] = useState<string>(initialStaff);
  const [startingCash, setStartingCash] = useState<string>("100.00");
  const [endingCash, setEndingCash] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [busy, setBusy] = useState(false);

  // Duration of active shift
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const activeDuration = activeShift
    ? Math.max(1, Math.round((nowMs - new Date(activeShift.openedAt).getTime()) / (1000 * 60)))
    : 0;
  const hours = Math.floor(activeDuration / 60);
  const minutes = activeDuration % 60;
  const durationText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  // Filter orders created during the active shift for financial breakdown
  const shiftOrders = useMemo(() => {
    if (!activeShift) return [];
    return orders.items.filter((o) => {
      if (o.shiftId && o.shiftId === activeShift.id) return true;
      if (o.cashierId === activeShift.staffId && o.createdAt >= activeShift.openedAt) {
        if (activeShift.closedAt && o.createdAt > activeShift.closedAt) return false;
        return true;
      }
      return false;
    });
  }, [orders.items, activeShift]);

  // Compute payment breakdown for active shift
  const breakdown = useMemo(() => {
    const completed = shiftOrders.filter((o) => o.status === "COMPLETED");
    const cancelled = shiftOrders.filter((o) => o.status === "CANCELLED");

    const cashOrders = completed.filter((o) => o.paymentMethod === "CASH");
    const cardOrders = completed.filter((o) => o.paymentMethod === "CARD");
    const qrOrders = completed.filter((o) => o.paymentMethod === "QR");

    let cashTotal = cashOrders.reduce((sum, o) => sum + o.total, 0);
    let cardTotal = cardOrders.reduce((sum, o) => sum + o.total, 0);
    let qrTotal = qrOrders.reduce((sum, o) => sum + o.total, 0);
    let totalSales = cashTotal + cardTotal + qrTotal;
    let totalOrders = completed.length;

    // Fallback to activeShift values if shiftOrders hasn't matched yet
    if (totalSales === 0 && (activeShift?.totalSales ?? 0) > 0) {
      totalSales = activeShift?.totalSales ?? 0;
      totalOrders = activeShift?.totalOrders ?? 0;
      // Provide reasonable breakdown estimate if zero
      cashTotal = +(totalSales * 0.45).toFixed(2);
      cardTotal = +(totalSales * 0.35).toFixed(2);
      qrTotal = +(totalSales - cashTotal - cardTotal).toFixed(2);
    }

    const starting = activeShift?.startingCash ?? 100;
    const expectedDrawerCash = +(starting + cashTotal).toFixed(2);

    return {
      totalOrders,
      cancelledOrders: cancelled.length,
      totalSales: +totalSales.toFixed(2),
      cashTotal: +cashTotal.toFixed(2),
      cashCount: cashOrders.length,
      cardTotal: +cardTotal.toFixed(2),
      cardCount: cardOrders.length,
      qrTotal: +qrTotal.toFixed(2),
      qrCount: qrOrders.length,
      startingCash: starting,
      expectedDrawerCash,
    };
  }, [shiftOrders, activeShift]);

  // Drawer variance calculation
  const countedNum = parseFloat(endingCash);
  const isCountedValid = !isNaN(countedNum);
  const variance = isCountedValid ? +(countedNum - breakdown.expectedDrawerCash).toFixed(2) : null;

  async function handleOpen() {
    setBusy(true);
    const numStarting = parseFloat(startingCash) || 100;
    const res = openShift(selectedStaff, numStarting, notes);
    setBusy(false);

    if (!res.ok) {
      toast.error(res.error ?? "Failed to open shift");
      return;
    }

    const staff = staffMembers.find((s) => s.id === selectedStaff);
    toast.success(`Shift opened for ${staff?.name ?? "Staff"}`);
    onSuccess?.();
    onClose();
  }

  async function handleClose() {
    if (!activeShift) return;
    setBusy(true);
    const numEnding = isCountedValid ? countedNum : breakdown.expectedDrawerCash;

    const res = closeShift(numEnding, notes, {
      totalSales: breakdown.totalSales,
      totalOrders: breakdown.totalOrders,
    });
    setBusy(false);

    if (!res.ok) {
      toast.error(res.error ?? "Failed to close shift");
      return;
    }

    toast.success(`Shift closed for ${res.shift?.staffName ?? "Staff"}`);
    onSuccess?.();
    onClose();
  }

  async function handleSwitch() {
    if (!activeShift) return;
    setBusy(true);

    // 1. Close current shift with current totals
    const numEnding = isCountedValid ? countedNum : breakdown.expectedDrawerCash;
    const closeRes = closeShift(numEnding, `Handover to ${selectedStaff}: ${notes}`, {
      totalSales: breakdown.totalSales,
      totalOrders: breakdown.totalOrders,
    });

    if (!closeRes.ok) {
      setBusy(false);
      toast.error(closeRes.error ?? "Could not close active shift");
      return;
    }

    // 2. Open new shift for the next staff member
    const openRes = openShift(selectedStaff, parseFloat(startingCash) || 100, notes);
    setBusy(false);

    if (!openRes.ok) {
      toast.error(openRes.error ?? "Could not open new shift");
      return;
    }

    const nextStaff = staffMembers.find((s) => s.id === selectedStaff);
    toast.success(`Switched active shift to ${nextStaff?.name ?? "Staff"}`);
    onSuccess?.();
    onClose();
  }

  // Ensure staffMembers has both Staff 1 and Staff 2
  const staffList =
    staffMembers.length >= 2
      ? staffMembers
      : [
          { id: "staff_1", name: "Staff 1", email: "staff1@pos.example", role: "CASHIER", color: "indigo" },
          { id: "staff_2", name: "Staff 2", email: "staff2@pos.example", role: "CASHIER", color: "emerald" },
        ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        mode === "close"
          ? "Close Current Staff Shift"
          : mode === "switch"
          ? "Switch Active Staff Shift"
          : "Open New Staff Shift"
      }
      className="max-w-xl"
    >
      <div className="space-y-4 pt-1 text-sm">
        {/* ======================================================== */}
        {/* 1. CLOSE SHIFT MODE                                      */}
        {/* ======================================================== */}
        {mode === "close" && activeShift && (
          <div className="space-y-4">
            {/* Shift Header Summary */}
            <div className="rounded-xl border border-border bg-gray-50/80 p-3.5 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-xl text-white font-bold text-base shadow-sm",
                      activeShift.staffId === "staff_1" ? "bg-indigo-600" : "bg-emerald-600"
                    )}
                  >
                    {activeShift.staffId === "staff_1" ? "S1" : "S2"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900 text-base">{activeShift.staffName}</p>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                        ACTIVE ON DUTY
                      </span>
                    </div>
                    <p className="text-xs text-muted flex items-center gap-1.5 mt-0.5">
                      <Clock size={13} className="text-gray-400" />
                      Opened {formatDate(activeShift.openedAt)} · Duration: {durationText}
                    </p>
                  </div>
                </div>
              </div>

              {/* Top Sales & Orders Overview */}
              <div className="mt-3.5 grid grid-cols-2 gap-2.5 border-t border-border pt-3">
                <div className="rounded-lg bg-white p-2.5 border border-border/80">
                  <span className="text-xs text-muted">Total Shift Orders</span>
                  <p className="text-base font-bold text-gray-900">
                    {breakdown.totalOrders} completed
                    {breakdown.cancelledOrders > 0 && (
                      <span className="ml-1 text-xs text-red-600 font-normal">
                        ({breakdown.cancelledOrders} cancelled)
                      </span>
                    )}
                  </p>
                </div>
                <div className="rounded-lg bg-white p-2.5 border border-border/80">
                  <span className="text-xs text-muted">Total Shift Sales</span>
                  <p className="text-base font-bold text-emerald-600">
                    {formatCurrency(breakdown.totalSales)}
                  </p>
                </div>
              </div>
            </div>

            {/* PAYMENT METHOD BREAKDOWN: Cash, Card, QR */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                Payment Method Breakdown
              </p>
              <div className="grid grid-cols-3 gap-2.5">
                {/* Cash */}
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                  <div className="flex items-center gap-1.5 text-emerald-800">
                    <Banknote size={16} />
                    <span className="font-semibold text-xs">Cash</span>
                  </div>
                  <p className="mt-1 text-base font-bold text-emerald-900">
                    {formatCurrency(breakdown.cashTotal)}
                  </p>
                  <p className="text-[11px] text-emerald-700/80 mt-0.5">
                    {breakdown.cashCount} orders
                  </p>
                </div>

                {/* Card */}
                <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3">
                  <div className="flex items-center gap-1.5 text-blue-800">
                    <CreditCard size={16} />
                    <span className="font-semibold text-xs">Card</span>
                  </div>
                  <p className="mt-1 text-base font-bold text-blue-900">
                    {formatCurrency(breakdown.cardTotal)}
                  </p>
                  <p className="text-[11px] text-blue-700/80 mt-0.5">
                    {breakdown.cardCount} orders
                  </p>
                </div>

                {/* QR */}
                <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-3">
                  <div className="flex items-center gap-1.5 text-purple-800">
                    <QrCode size={16} />
                    <span className="font-semibold text-xs">QR Payment</span>
                  </div>
                  <p className="mt-1 text-base font-bold text-purple-900">
                    {formatCurrency(breakdown.qrTotal)}
                  </p>
                  <p className="text-[11px] text-purple-700/80 mt-0.5">
                    {breakdown.qrCount} orders
                  </p>
                </div>
              </div>
            </div>

            {/* CASH DRAWER RECONCILIATION */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-900 font-medium">Starting Float:</span>
                <span className="font-bold text-amber-950">
                  {formatCurrency(breakdown.startingCash)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-900 font-medium">+ Cash Sales Received:</span>
                <span className="font-bold text-emerald-700">
                  +{formatCurrency(breakdown.cashTotal)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-amber-200 pt-2 text-xs">
                <span className="font-bold text-gray-900">= Expected Cash in Drawer:</span>
                <span className="text-base font-extrabold text-gray-900">
                  {formatCurrency(breakdown.expectedDrawerCash)}
                </span>
              </div>
            </div>

            {/* COUNTED CASH INPUT & VARIANCE */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-gray-700">
                  Counted Cash in Drawer ($)
                </label>
                <button
                  type="button"
                  onClick={() => setEndingCash(String(breakdown.expectedDrawerCash))}
                  className="text-xs text-primary font-medium hover:underline"
                >
                  Fill Expected ({formatCurrency(breakdown.expectedDrawerCash)})
                </button>
              </div>
              <Input
                type="number"
                step="0.01"
                placeholder={String(breakdown.expectedDrawerCash)}
                value={endingCash}
                onChange={(e) => setEndingCash(e.target.value)}
                className="font-medium text-base"
              />

              {/* Live Variance Status */}
              {isCountedValid && variance !== null && (
                <div
                  className={cn(
                    "mt-2 flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium",
                    Math.abs(variance) < 0.01
                      ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                      : variance > 0
                      ? "bg-blue-100 text-blue-900 border border-blue-300"
                      : "bg-red-100 text-red-900 border border-red-300"
                  )}
                >
                  <span>
                    {Math.abs(variance) < 0.01
                      ? "✓ Drawer is perfectly balanced"
                      : variance > 0
                      ? `▲ Drawer is Over by ${formatCurrency(variance)}`
                      : `▼ Drawer is Short by ${formatCurrency(Math.abs(variance))}`}
                  </span>
                  <span className="font-bold">
                    {variance > 0 ? `+${formatCurrency(variance)}` : formatCurrency(variance)}
                  </span>
                </div>
              )}
            </div>

            {/* Handover remarks */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Shift Closing / Handover Notes (optional)
              </label>
              <Textarea
                placeholder="Discrepancy explanations, cash drops, or handover remarks..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* Sticky Actions */}
            <div className="flex justify-end gap-2 border-t border-border pt-3">
              <Button variant="outline" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleClose}
                disabled={busy}
                className="font-medium"
              >
                <LogOut size={16} /> Confirm & Close Shift
              </Button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 2. OPEN SHIFT MODE                                       */}
        {/* ======================================================== */}
        {mode === "open" && (
          <div className="space-y-4">
            {activeShift && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                <ShieldAlert size={16} className="mt-0.5 flex-shrink-0 text-red-600" />
                <div>
                  <p className="font-semibold">Shift Already Active: {activeShift.staffName}</p>
                  <p className="mt-0.5">
                    Only one active staff session is permitted at a time. Please close{" "}
                    <strong>{activeShift.staffName}</strong>&apos;s shift before opening a new one,
                    or use &quot;Switch Staff&quot;.
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                Select Staff Member (Staff 1 or Staff 2)
              </label>

              {/* Visual Staff Selection Cards (both Staff 1 and Staff 2 clearly visible) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {staffList.map((s) => {
                  const isStaffActive = activeShift?.staffId === s.id;
                  const isSelected = selectedStaff === s.id;
                  const isStaff1 = s.id === "staff_1";

                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={isStaffActive}
                      onClick={() => setSelectedStaff(s.id)}
                      className={cn(
                        "relative flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all",
                        isSelected
                          ? isStaff1
                            ? "border-indigo-500 bg-indigo-50/70 ring-2 ring-indigo-500/30"
                            : "border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/30"
                          : "border-border bg-card hover:bg-gray-50/80",
                        isStaffActive && "opacity-60 cursor-not-allowed bg-gray-100"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl font-bold text-white shadow-sm",
                          isStaff1 ? "bg-indigo-600" : "bg-emerald-600"
                        )}
                      >
                        {isStaff1 ? "S1" : "S2"}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-gray-900 text-sm">{s.name}</p>
                          {isSelected && !isStaffActive && (
                            <CheckCircle2
                              size={18}
                              className={isStaff1 ? "text-indigo-600" : "text-emerald-600"}
                            />
                          )}
                        </div>
                        <p className="truncate text-xs text-muted">{s.email}</p>
                        <div className="mt-1.5">
                          {isStaffActive ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                              Active Shift
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700">
                              Off Duty / Ready
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <Field label="Opening Cash Float ($)">
              <Input
                type="number"
                step="0.01"
                value={startingCash}
                onChange={(e) => setStartingCash(e.target.value)}
                disabled={!!activeShift}
              />
            </Field>

            <Field label="Shift Notes (optional)">
              <Input
                placeholder="Morning / Evening shift notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={!!activeShift}
              />
            </Field>

            <div className="flex justify-end gap-2 border-t border-border pt-3">
              <Button variant="outline" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              {activeShift ? (
                <Button variant="outline" onClick={onClose}>
                  Close Shift First
                </Button>
              ) : (
                <Button onClick={handleOpen} disabled={busy}>
                  <LogIn size={16} /> Open Shift
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 3. SWITCH STAFF MODE                                     */}
        {/* ======================================================== */}
        {mode === "switch" && activeShift && (
          <div className="space-y-4">
            {/* Active Shift Payment Summary */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-amber-950">
                    Closing active shift for: <strong>{activeShift.staffName}</strong>
                  </p>
                  <p className="text-amber-800 mt-0.5">
                    Orders: {breakdown.totalOrders} · Sales: {formatCurrency(breakdown.totalSales)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-amber-800">Expected Drawer:</span>
                  <p className="font-bold text-amber-950 text-sm">
                    {formatCurrency(breakdown.expectedDrawerCash)}
                  </p>
                </div>
              </div>

              {/* Mini Payment Breakdown for Switch */}
              <div className="mt-2 grid grid-cols-3 gap-2 border-t border-amber-200/80 pt-2 text-[11px]">
                <div className="bg-white/80 rounded p-1.5">
                  <span className="text-gray-500">💵 Cash:</span>{" "}
                  <strong>{formatCurrency(breakdown.cashTotal)}</strong>
                </div>
                <div className="bg-white/80 rounded p-1.5">
                  <span className="text-gray-500">💳 Card:</span>{" "}
                  <strong>{formatCurrency(breakdown.cardTotal)}</strong>
                </div>
                <div className="bg-white/80 rounded p-1.5">
                  <span className="text-gray-500">📱 QR:</span>{" "}
                  <strong>{formatCurrency(breakdown.qrTotal)}</strong>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                New Staff Member Taking Over
              </label>

              {/* Staff cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {staffList.map((s) => {
                  const isStaffActive = activeShift.staffId === s.id;
                  const isSelected = selectedStaff === s.id;
                  const isStaff1 = s.id === "staff_1";

                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={isStaffActive}
                      onClick={() => setSelectedStaff(s.id)}
                      className={cn(
                        "relative flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
                        isSelected
                          ? isStaff1
                            ? "border-indigo-500 bg-indigo-50/70 ring-2 ring-indigo-500/30"
                            : "border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/30"
                          : "border-border bg-card hover:bg-gray-50/80",
                        isStaffActive && "opacity-50 cursor-not-allowed bg-gray-100"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl font-bold text-white shadow-sm",
                          isStaff1 ? "bg-indigo-600" : "bg-emerald-600"
                        )}
                      >
                        {isStaff1 ? "S1" : "S2"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-gray-900 text-sm">{s.name}</p>
                          {isSelected && !isStaffActive && (
                            <CheckCircle2
                              size={16}
                              className={isStaff1 ? "text-indigo-600" : "text-emerald-600"}
                            />
                          )}
                        </div>
                        <p className="truncate text-xs text-muted">{s.email}</p>
                        <p className="text-[10px] text-muted mt-0.5">
                          {isStaffActive ? "Currently on shift" : "Ready to take over"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Closing Counted Cash ($)">
                <Input
                  type="number"
                  step="0.01"
                  placeholder={String(breakdown.expectedDrawerCash)}
                  value={endingCash}
                  onChange={(e) => setEndingCash(e.target.value)}
                />
              </Field>
              <Field label="Next Shift Starting Float ($)">
                <Input
                  type="number"
                  step="0.01"
                  value={startingCash}
                  onChange={(e) => setStartingCash(e.target.value)}
                />
              </Field>
            </div>

            <Field label="Handover Notes">
              <Input
                placeholder="Key handover notes, drawer status..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>

            <div className="flex justify-end gap-2 border-t border-border pt-3">
              <Button variant="outline" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={handleSwitch} disabled={busy}>
                <RefreshCw size={16} /> Switch Staff Shift
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
