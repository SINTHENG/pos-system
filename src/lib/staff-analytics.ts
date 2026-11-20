import type { Order, StaffShift } from "@/types";

export type DateFilterPreset = "today" | "yesterday" | "week" | "month" | "custom" | "all";
export type StaffFilterId = "all" | "staff_1" | "staff_2";

export interface StaffPerformanceStats {
  staffId: string;
  staffName: string;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  pendingOrders: number;
  refundedOrders: number;
  totalSales: number;
  averageOrderValue: number;
  latestShiftOpenedAt?: string;
  latestShiftClosedAt?: string;
  activeShiftStatus?: "OPEN" | "CLOSED";
}

export interface TodayOverallReport {
  totalOrdersToday: number;
  totalSalesToday: number;
  averageOrderValueToday: number;
  totalOrdersStaff1: number;
  totalOrdersStaff2: number;
  totalSalesStaff1: number;
  totalSalesStaff2: number;
  completedStaff1: number;
  completedStaff2: number;
  cancelledStaff1: number;
  cancelledStaff2: number;
}

/** Check if an ISO date string falls on today (local day) */
export function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/** Check if an ISO date string falls on yesterday (local day) */
export function isYesterday(iso: string): boolean {
  const d = new Date(iso);
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return (
    d.getFullYear() === y.getFullYear() &&
    d.getMonth() === y.getMonth() &&
    d.getDate() === y.getDate()
  );
}

/** Filter orders by preset date range or custom ISO start/end */
export function filterOrdersByDate(
  orders: Order[],
  preset: DateFilterPreset,
  customFrom?: string,
  customTo?: string
): Order[] {
  const now = new Date();

  return orders.filter((o) => {
    const d = new Date(o.createdAt);
    const dateStr = o.createdAt.slice(0, 10);

    switch (preset) {
      case "today":
        return isToday(o.createdAt);

      case "yesterday":
        return isYesterday(o.createdAt);

      case "week": {
        // Start of current week (Monday)
        const dayOfWeek = (now.getDay() + 6) % 7; // 0 for Monday
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - dayOfWeek);
        startOfWeek.setHours(0, 0, 0, 0);
        return d >= startOfWeek;
      }

      case "month": {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return d >= startOfMonth;
      }

      case "custom": {
        if (customFrom && dateStr < customFrom) return false;
        if (customTo && dateStr > customTo) return false;
        return true;
      }

      case "all":
      default:
        return true;
    }
  });
}

/** Filter orders by staff member */
export function filterOrdersByStaff(
  orders: Order[],
  staffFilter: StaffFilterId
): Order[] {
  if (staffFilter === "all") return orders;
  return orders.filter((o) => o.cashierId === staffFilter);
}

/**
 * Calculates metrics according to Section 5 Rules:
 * - Total Orders = count of orders in period
 * - Total Sales = sum of completed orders
 * - Average Order Value = Total Sales / Number of Completed Orders
 * - Cancelled orders are excluded from total sales and counted separately
 */
export function calculateStaffStats(
  orders: Order[],
  shifts: StaffShift[],
  staffId: string,
  staffName: string
): StaffPerformanceStats {
  const staffOrders = orders.filter((o) => o.cashierId === staffId);
  const staffShifts = shifts
    .filter((s) => s.staffId === staffId)
    .sort((a, b) => b.openedAt.localeCompare(a.openedAt));

  const latestShift = staffShifts[0];

  const completed = staffOrders.filter((o) => o.status === "COMPLETED");
  const cancelled = staffOrders.filter((o) => o.status === "CANCELLED");
  const pending = staffOrders.filter((o) => o.status === "PENDING");
  const refunded = staffOrders.filter((o) => o.status === "REFUNDED");

  // Sum only completed order amounts
  const totalSales = completed.reduce((sum, o) => sum + o.total, 0);
  const averageOrderValue =
    completed.length > 0 ? +(totalSales / completed.length).toFixed(2) : 0;

  return {
    staffId,
    staffName,
    totalOrders: staffOrders.length,
    completedOrders: completed.length,
    cancelledOrders: cancelled.length,
    pendingOrders: pending.length,
    refundedOrders: refunded.length,
    totalSales: +totalSales.toFixed(2),
    averageOrderValue,
    latestShiftOpenedAt: latestShift?.openedAt,
    latestShiftClosedAt: latestShift?.closedAt,
    activeShiftStatus: latestShift?.status,
  };
}

/** Calculate summary for all orders in the current filtered set */
export function calculateCombinedStats(
  orders: Order[],
  shifts: StaffShift[]
): StaffPerformanceStats {
  const completed = orders.filter((o) => o.status === "COMPLETED");
  const cancelled = orders.filter((o) => o.status === "CANCELLED");
  const pending = orders.filter((o) => o.status === "PENDING");
  const refunded = orders.filter((o) => o.status === "REFUNDED");

  const totalSales = completed.reduce((sum, o) => sum + o.total, 0);
  const averageOrderValue =
    completed.length > 0 ? +(totalSales / completed.length).toFixed(2) : 0;

  const sortedShifts = [...shifts].sort((a, b) =>
    b.openedAt.localeCompare(a.openedAt)
  );
  const activeShift = sortedShifts.find((s) => s.status === "OPEN");

  return {
    staffId: "all",
    staffName: "All Staff",
    totalOrders: orders.length,
    completedOrders: completed.length,
    cancelledOrders: cancelled.length,
    pendingOrders: pending.length,
    refundedOrders: refunded.length,
    totalSales: +totalSales.toFixed(2),
    averageOrderValue,
    latestShiftOpenedAt: activeShift?.openedAt ?? sortedShifts[0]?.openedAt,
    latestShiftClosedAt: activeShift ? undefined : sortedShifts[0]?.closedAt,
    activeShiftStatus: activeShift ? "OPEN" : "CLOSED",
  };
}

/** Calculate Section 3: Today's Overall Report */
export function calculateTodayOverallReport(orders: Order[]): TodayOverallReport {
  const todayOrders = orders.filter((o) => isToday(o.createdAt));
  const todayCompleted = todayOrders.filter((o) => o.status === "COMPLETED");

  const totalSalesToday = todayCompleted.reduce((sum, o) => sum + o.total, 0);
  const averageOrderValueToday =
    todayCompleted.length > 0
      ? +(totalSalesToday / todayCompleted.length).toFixed(2)
      : 0;

  const staff1Orders = todayOrders.filter((o) => o.cashierId === "staff_1");
  const staff2Orders = todayOrders.filter((o) => o.cashierId === "staff_2");

  const completedStaff1 = staff1Orders.filter((o) => o.status === "COMPLETED");
  const completedStaff2 = staff2Orders.filter((o) => o.status === "COMPLETED");

  const cancelledStaff1 = staff1Orders.filter((o) => o.status === "CANCELLED");
  const cancelledStaff2 = staff2Orders.filter((o) => o.status === "CANCELLED");

  const totalSalesStaff1 = completedStaff1.reduce((sum, o) => sum + o.total, 0);
  const totalSalesStaff2 = completedStaff2.reduce((sum, o) => sum + o.total, 0);

  return {
    totalOrdersToday: todayOrders.length,
    totalSalesToday: +totalSalesToday.toFixed(2),
    averageOrderValueToday,
    totalOrdersStaff1: staff1Orders.length,
    totalOrdersStaff2: staff2Orders.length,
    totalSalesStaff1: +totalSalesStaff1.toFixed(2),
    totalSalesStaff2: +totalSalesStaff2.toFixed(2),
    completedStaff1: completedStaff1.length,
    completedStaff2: completedStaff2.length,
    cancelledStaff1: cancelledStaff1.length,
    cancelledStaff2: cancelledStaff2.length,
  };
}
