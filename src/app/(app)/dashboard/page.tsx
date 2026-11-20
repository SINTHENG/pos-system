"use client";

import { useMemo, useState } from "react";
import {
  Calendar,
  DollarSign,
  LogIn,
  LogOut,
  Receipt,
  RefreshCw,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/fields";
import { AreaTrend, BarSimple, DonutChart } from "@/components/charts/charts";
import { ShiftModal } from "@/components/shifts/shift-modal";
import { useResource } from "@/hooks/use-resource";
import { categoryService, customerService, orderService, productService, stockMovementService } from "@/services";
import { completed, dailySales, monthlyRevenue, productSales, revenueTotal, salesByCategory, stockStatus } from "@/lib/analytics";
import { useShiftStore } from "@/store/shift-store";
import {
  DateFilterPreset,
  StaffFilterId,
  calculateCombinedStats,
  calculateStaffStats,
  calculateTodayOverallReport,
  filterOrdersByDate,
  filterOrdersByStaff,
} from "@/lib/staff-analytics";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const orders = useResource(orderService, "Order");
  const products = useResource(productService, "Product");
  const customers = useResource(customerService, "Customer");
  const categories = useResource(categoryService, "Category");
  const movements = useResource(stockMovementService, "Movement");

  const { activeShift, shifts } = useShiftStore();

  // Filters for Section 4: Staff & Date Filtering
  const [staffFilter, setStaffFilter] = useState<StaffFilterId>("all");
  const [dateFilter, setDateFilter] = useState<DateFilterPreset>("all");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [shiftModalMode, setShiftModalMode] = useState<"open" | "close" | "switch" | null>(null);

  const loading = orders.loading || products.loading || customers.loading || categories.loading;
  const error = orders.error || products.error || customers.error || categories.error;

  // Active shift duration
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const activeDuration = activeShift
    ? Math.max(1, Math.round((nowMs - new Date(activeShift.openedAt).getTime()) / (1000 * 60)))
    : 0;
  const hours = Math.floor(activeDuration / 60);
  const minutes = activeDuration % 60;
  const durationText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  // Filtered orders according to Section 4
  const filteredOrders = useMemo(() => {
    let result = filterOrdersByDate(orders.items, dateFilter, customFrom, customTo);
    result = filterOrdersByStaff(result, staffFilter);
    return result;
  }, [orders.items, dateFilter, customFrom, customTo, staffFilter]);

  // Section 5 calculations: Staff 1, Staff 2, and Combined metrics
  const staff1Stats = useMemo(
    () =>
      calculateStaffStats(
        filterOrdersByDate(orders.items, dateFilter, customFrom, customTo),
        shifts,
        "staff_1",
        "Staff 1"
      ),
    [orders.items, dateFilter, customFrom, customTo, shifts]
  );

  const staff2Stats = useMemo(
    () =>
      calculateStaffStats(
        filterOrdersByDate(orders.items, dateFilter, customFrom, customTo),
        shifts,
        "staff_2",
        "Staff 2"
      ),
    [orders.items, dateFilter, customFrom, customTo, shifts]
  );

  const currentStats = useMemo(() => {
    if (staffFilter === "staff_1") return staff1Stats;
    if (staffFilter === "staff_2") return staff2Stats;
    return calculateCombinedStats(filteredOrders, shifts);
  }, [staffFilter, staff1Stats, staff2Stats, filteredOrders, shifts]);

  // Section 3: Today's Overall Report
  const todayReport = useMemo(() => calculateTodayOverallReport(orders.items), [orders.items]);

  // Standard store analytics data
  const data = useMemo(() => {
    const sold = productSales(orders.items);
    return {
      revenue: revenueTotal(orders.items),
      sales: completed(orders.items).length,
      low: products.items.filter((p) => stockStatus(p) !== "OK"),
      daily: dailySales(orders.items, 14),
      monthly: monthlyRevenue(orders.items),
      byCategory: salesByCategory(orders.items, products.items, categories.items),
      top: sold.slice(0, 5),
      recent: [...orders.items]
        .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
        .slice(0, 6),
    };
  }, [orders.items, products.items, categories.items]);

  const activities = useMemo(() => {
    const names = new Map(products.items.map((p) => [p.id, p.name]));
    const fromOrders = data.recent.slice(0, 4).map((o) => ({
      at: o.createdAt ?? "",
      text: `Order ${o.orderNumber ?? o.id} by ${o.cashierName ?? "Staff"} (${o.status.toLowerCase()}) - ${formatCurrency(o.total)}`,
    }));
    const fromStock = movements.items.slice(0, 4).map((m) => ({
      at: m.createdAt ?? "",
      text: `Stock ${m.type.toLowerCase()}: ${m.quantity} x ${names.get(m.productId) ?? m.productId}`,
    }));
    return [...fromOrders, ...fromStock].sort((a, b) => (b.at ?? "").localeCompare(a.at ?? "")).slice(0, 6);
  }, [data.recent, movements.items, products.items]);

  if (error) {
    return <div className="rounded-2xl bg-red-50 p-6 text-sm text-red-700">Failed to load dashboard: {error}</div>;
  }
  if (loading) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="POS Staff Shift & Order Tracking Overview"
      />

      {/* SECTION 6: STAFF SHIFT STATUS BANNER */}
      <div
        className={cn(
          "mb-6 rounded-2xl border p-4 shadow-xs transition-all",
          activeShift
            ? "border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white"
            : "border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50/50 to-white"
        )}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-2xl font-bold text-white shadow-xs text-base",
                activeShift
                  ? activeShift.staffId === "staff_1"
                    ? "bg-indigo-600"
                    : "bg-emerald-600"
                  : "bg-amber-500"
              )}
            >
              {activeShift ? (activeShift.staffId === "staff_1" ? "S1" : "S2") : "OFF"}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 text-base">
                  {activeShift ? `${activeShift.staffName} (On Duty)` : "No Active Shift"}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    activeShift
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  )}
                >
                  {activeShift ? "ACTIVE SHIFT" : "OFF DUTY"}
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5">
                {activeShift
                  ? `Shift started at ${formatDate(activeShift.openedAt)} (${durationText}) · Starting Float: ${formatCurrency(activeShift.startingCash ?? 100)}`
                  : "Only one active staff session is allowed at a time. Open a shift to start taking orders."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeShift ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white"
                  onClick={() => setShiftModalMode("switch")}
                >
                  <RefreshCw size={14} className="mr-1.5 text-primary" /> Switch Staff
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShiftModalMode("close")}
                >
                  <LogOut size={14} className="mr-1.5" /> Close Shift
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-xs"
                onClick={() => setShiftModalMode("open")}
              >
                <LogIn size={14} className="mr-1.5" /> Open Shift
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 4: FILTERING SYSTEM (Staff & Date Ranges) */}
      <Card className="mb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Staff Filter Selector */}
          <div>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
              Staff Filter
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: "all", label: "All Staff" },
                  { id: "staff_1", label: "Staff 1" },
                  { id: "staff_2", label: "Staff 2" },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setStaffFilter(f.id)}
                  className={cn(
                    "rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all",
                    staffFilter === f.id
                      ? f.id === "staff_1"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : f.id === "staff_2"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-primary text-primary-foreground shadow-xs"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range Selector */}
          <div>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
              Date Period
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: "all", label: "All Time" },
                  { id: "today", label: "Today" },
                  { id: "yesterday", label: "Yesterday" },
                  { id: "week", label: "This Week" },
                  { id: "month", label: "This Month" },
                  { id: "custom", label: "Custom Range" },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setDateFilter(p.id)}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-xs font-medium transition",
                    dateFilter === p.id
                      ? "border border-primary bg-primary/10 text-primary font-bold"
                      : "border border-border bg-card text-gray-700 hover:bg-gray-50"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Custom date range inputs */}
        {dateFilter === "custom" && (
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3 text-xs">
            <span className="font-medium text-muted">From:</span>
            <Input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="h-8 w-36"
            />
            <span className="font-medium text-muted">To:</span>
            <Input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="h-8 w-36"
            />
          </div>
        )}
      </Card>

      {/* SECTION 5: FILTERED PERFORMANCE STAT CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={`${currentStats.staffName} Total Orders`}
          value={String(currentStats.totalOrders)}
          icon={Receipt}
          tone="blue"
        />
        <StatCard
          label={`${currentStats.staffName} Total Sales`}
          value={formatCurrency(currentStats.totalSales)}
          icon={DollarSign}
          tone="green"
        />
        <StatCard
          label="Average Order Value"
          value={formatCurrency(currentStats.averageOrderValue)}
          icon={TrendingUp}
        />
        <StatCard
          label="Cancelled Orders (Excluded)"
          value={String(currentStats.cancelledOrders)}
          icon={XCircle}
          tone="red"
        />
      </div>

      {/* SECTION 3: STAFF 1 VS STAFF 2 PERFORMANCE COMPARISON */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Staff 1 Performance Card */}
        <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50/40 via-white to-white">
          <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white shadow-xs">
                S1
              </div>
              <div>
                <CardTitle className="text-base text-indigo-950">Staff 1 Performance</CardTitle>
                <p className="text-xs text-muted">staff1@pos.example</p>
              </div>
            </div>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold",
                activeShift?.staffId === "staff_1"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-gray-100 text-gray-700"
              )}
            >
              {activeShift?.staffId === "staff_1" ? "Active Shift" : "Shift Closed"}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-indigo-100 bg-white p-3">
              <span className="text-xs text-muted">Total Orders</span>
              <p className="text-xl font-bold text-gray-900">{staff1Stats.totalOrders}</p>
              <p className="text-[11px] text-muted mt-0.5">
                {staff1Stats.completedOrders} completed · {staff1Stats.cancelledOrders} cancelled
              </p>
            </div>
            <div className="rounded-xl border border-indigo-100 bg-white p-3">
              <span className="text-xs text-muted">Total Sales</span>
              <p className="text-xl font-bold text-emerald-600">
                {formatCurrency(staff1Stats.totalSales)}
              </p>
              <p className="text-[11px] text-muted mt-0.5">Completed orders only</p>
            </div>
            <div className="rounded-xl border border-indigo-100 bg-white p-3">
              <span className="text-xs text-muted">Avg Order Value (AOV)</span>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(staff1Stats.averageOrderValue)}
              </p>
              <p className="text-[11px] text-muted mt-0.5">Per completed order</p>
            </div>
            <div className="rounded-xl border border-indigo-100 bg-white p-3">
              <span className="text-xs text-muted">Shift Timeline</span>
              <p className="truncate text-xs font-medium text-gray-900 mt-1">
                Open: {staff1Stats.latestShiftOpenedAt ? formatDate(staff1Stats.latestShiftOpenedAt) : "-"}
              </p>
              <p className="truncate text-xs font-medium text-muted">
                Close: {staff1Stats.latestShiftClosedAt ? formatDate(staff1Stats.latestShiftClosedAt) : activeShift?.staffId === "staff_1" ? "Still Open" : "-"}
              </p>
            </div>
          </div>
        </Card>

        {/* Staff 2 Performance Card */}
        <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50/40 via-white to-white">
          <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 font-bold text-white shadow-xs">
                S2
              </div>
              <div>
                <CardTitle className="text-base text-emerald-950">Staff 2 Performance</CardTitle>
                <p className="text-xs text-muted">staff2@pos.example</p>
              </div>
            </div>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold",
                activeShift?.staffId === "staff_2"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-gray-100 text-gray-700"
              )}
            >
              {activeShift?.staffId === "staff_2" ? "Active Shift" : "Shift Closed"}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-emerald-100 bg-white p-3">
              <span className="text-xs text-muted">Total Orders</span>
              <p className="text-xl font-bold text-gray-900">{staff2Stats.totalOrders}</p>
              <p className="text-[11px] text-muted mt-0.5">
                {staff2Stats.completedOrders} completed · {staff2Stats.cancelledOrders} cancelled
              </p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-white p-3">
              <span className="text-xs text-muted">Total Sales</span>
              <p className="text-xl font-bold text-emerald-600">
                {formatCurrency(staff2Stats.totalSales)}
              </p>
              <p className="text-[11px] text-muted mt-0.5">Completed orders only</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-white p-3">
              <span className="text-xs text-muted">Avg Order Value (AOV)</span>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(staff2Stats.averageOrderValue)}
              </p>
              <p className="text-[11px] text-muted mt-0.5">Per completed order</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-white p-3">
              <span className="text-xs text-muted">Shift Timeline</span>
              <p className="truncate text-xs font-medium text-gray-900 mt-1">
                Open: {staff2Stats.latestShiftOpenedAt ? formatDate(staff2Stats.latestShiftOpenedAt) : "-"}
              </p>
              <p className="truncate text-xs font-medium text-muted">
                Close: {staff2Stats.latestShiftClosedAt ? formatDate(staff2Stats.latestShiftClosedAt) : activeShift?.staffId === "staff_2" ? "Still Open" : "-"}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* SECTION 3: TODAY'S OVERALL REPORT */}
      <Card className="mt-6">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar size={18} className="text-primary" />
            Today&apos;s Overall Staff Report
          </CardTitle>
          <span className="text-xs text-muted">Live daily summary</span>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border p-3">
            <span className="text-xs text-muted">Today&apos;s Total Orders</span>
            <p className="text-2xl font-bold text-gray-900">{todayReport.totalOrdersToday}</p>
            <div className="mt-2 space-y-1 text-xs">
              <div className="flex justify-between text-muted">
                <span>Staff 1 Orders:</span>
                <span className="font-semibold text-indigo-700">{todayReport.totalOrdersStaff1}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Staff 2 Orders:</span>
                <span className="font-semibold text-emerald-700">{todayReport.totalOrdersStaff2}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border p-3">
            <span className="text-xs text-muted">Today&apos;s Total Sales</span>
            <p className="text-2xl font-bold text-emerald-600">
              {formatCurrency(todayReport.totalSalesToday)}
            </p>
            <div className="mt-2 space-y-1 text-xs">
              <div className="flex justify-between text-muted">
                <span>Staff 1 Sales:</span>
                <span className="font-semibold text-indigo-700">
                  {formatCurrency(todayReport.totalSalesStaff1)}
                </span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Staff 2 Sales:</span>
                <span className="font-semibold text-emerald-700">
                  {formatCurrency(todayReport.totalSalesStaff2)}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border p-3">
            <span className="text-xs text-muted">Today&apos;s Avg Order Value (AOV)</span>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(todayReport.averageOrderValueToday)}
            </p>
            <div className="mt-2 space-y-1 text-xs">
              <div className="flex justify-between text-muted">
                <span>Staff 1 Completed:</span>
                <span className="font-semibold text-gray-800">{todayReport.completedStaff1}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Staff 2 Completed:</span>
                <span className="font-semibold text-gray-800">{todayReport.completedStaff2}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Visual Sales Share Bar between Staff 1 and Staff 2 */}
        {todayReport.totalSalesToday > 0 && (
          <div className="mt-4 pt-3 border-t border-border">
            <div className="flex justify-between text-xs font-medium mb-1.5">
              <span className="text-indigo-700">
                Staff 1 ({Math.round((todayReport.totalSalesStaff1 / todayReport.totalSalesToday) * 100)}%)
              </span>
              <span className="text-emerald-700">
                Staff 2 ({Math.round((todayReport.totalSalesStaff2 / todayReport.totalSalesToday) * 100)}%)
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200 flex">
              <div
                className="bg-indigo-600 transition-all"
                style={{
                  width: `${(todayReport.totalSalesStaff1 / todayReport.totalSalesToday) * 100}%`,
                }}
              />
              <div
                className="bg-emerald-500 transition-all"
                style={{
                  width: `${(todayReport.totalSalesStaff2 / todayReport.totalSalesToday) * 100}%`,
                }}
              />
            </div>
          </div>
        )}
      </Card>

      {/* CHARTS SECTION */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Daily Sales Overview</CardTitle>
          <AreaTrend data={data.daily} xKey="date" yKey="total" />
        </Card>
        <Card>
          <CardTitle>Monthly Revenue</CardTitle>
          <BarSimple data={data.monthly} xKey="month" yKey="revenue" />
        </Card>
        <Card>
          <CardTitle>Sales by Category</CardTitle>
          <DonutChart data={data.byCategory} />
        </Card>
        <Card>
          <CardTitle>Top Selling Products</CardTitle>
          <BarSimple data={data.top.map((t) => ({ name: t.name, qty: t.qty }))} xKey="name" yKey="qty" horizontal />
        </Card>
      </div>

      {/* RECENT ORDERS WITH CONTINUOUS NUMBER & STAFF BADGE */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between mb-2">
            <CardTitle>Recent Orders & Cashier Assignment</CardTitle>
            <span className="text-xs text-muted">Global Continuous Numbering</span>
          </div>
          <ul className="divide-y divide-border text-sm">
            {data.recent.map((o) => {
              const isStaff1 = o.cashierId === "staff_1";
              return (
                <li key={o.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white",
                        isStaff1 ? "bg-indigo-600" : "bg-emerald-600"
                      )}
                    >
                      {isStaff1 ? "S1" : "S2"}
                    </span>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {o.orderNumber ? `${o.orderNumber} (${o.id})` : o.id}
                      </p>
                      <p className="text-xs text-muted">
                        {formatDate(o.createdAt)} · {o.cashierName ?? (isStaff1 ? "Staff 1" : "Staff 2")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={o.status} />
                    <span className="w-20 text-right font-medium">{formatCurrency(o.total)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card>
          <CardTitle>Recent Activities</CardTitle>
          <ul className="space-y-3 text-sm">
            {activities.map((a, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div>
                  <p>{a.text}</p>
                  <p className="text-xs text-muted">{formatDate(a.at)}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <ShiftModal
        open={shiftModalMode !== null}
        mode={shiftModalMode ?? "open"}
        onClose={() => setShiftModalMode(null)}
      />
    </>
  );
}
