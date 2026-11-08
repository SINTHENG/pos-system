"use client";

import { useMemo, useState } from "react";
import { FileDown, FileText } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/fields";
import { AreaTrend, BarSimple, DonutChart } from "@/components/charts/charts";
import { useResource } from "@/hooks/use-resource";
import { orderService, productService } from "@/services";
import { completed, paymentBreakdown, productSales, stockStatus } from "@/lib/analytics";
import { exportCsv, exportPdf } from "@/lib/export";
import { cn, formatCurrency } from "@/lib/utils";

type ReportId = "daily" | "weekly" | "monthly" | "yearly" | "product" | "inventory" | "profit" | "payment";
const REPORTS: { id: ReportId; label: string }[] = [
  { id: "daily", label: "Daily sales" },
  { id: "weekly", label: "Weekly sales" },
  { id: "monthly", label: "Monthly sales" },
  { id: "yearly", label: "Yearly sales" },
  { id: "product", label: "Product sales" },
  { id: "inventory", label: "Inventory" },
  { id: "profit", label: "Profit & revenue" },
  { id: "payment", label: "Payment methods" },
];

function weekKey(iso: string) {
  const d = new Date(iso);
  const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getUTCDay() + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export default function ReportsPage() {
  const orders = useResource(orderService, "Order");
  const products = useResource(productService, "Product");
  const [report, setReport] = useState<ReportId>("daily");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(
    () => completed(orders.items).filter((o) => (!from || o.createdAt.slice(0, 10) >= from) && (!to || o.createdAt.slice(0, 10) <= to)),
    [orders.items, from, to],
  );

  const view = useMemo(() => {
    const group = (keyFn: (iso: string) => string) => {
      const map = new Map<string, { orders: number; revenue: number }>();
      filtered.forEach((o) => {
        const k = keyFn(o.createdAt);
        const cur = map.get(k) ?? { orders: 0, revenue: 0 };
        cur.orders += 1;
        cur.revenue += o.total;
        map.set(k, cur);
      });
      return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([period, v]) => ({ period, orders: v.orders, revenue: +v.revenue.toFixed(2) }));
    };
    const costOf = new Map(products.items.map((p) => [p.id, p.purchasePrice]));

    switch (report) {
      case "daily": case "weekly": case "monthly": case "yearly": {
        const keyFn = { daily: (i: string) => i.slice(0, 10), weekly: weekKey, monthly: (i: string) => i.slice(0, 7), yearly: (i: string) => i.slice(0, 4) }[report];
        const data = group(keyFn);
        return { chart: "area" as const, data, rows: data.map((d) => ({ Period: d.period, Orders: d.orders, Revenue: d.revenue })) };
      }
      case "product": {
        const data = productSales(filtered);
        return { chart: "barH" as const, data: data.slice(0, 8).map((d) => ({ name: d.name, qty: d.qty })), rows: data.map((d) => ({ Product: d.name, "Units sold": d.qty, Revenue: d.revenue })) };
      }
      case "inventory": {
        const data = products.items.map((p) => ({ name: p.name, stock: p.stock }));
        return {
          chart: "bar" as const, data,
          rows: products.items.map((p) => ({ SKU: p.sku, Product: p.name, Stock: p.stock, "Min level": p.minStock, Status: stockStatus(p), "Stock value (cost)": +(p.stock * p.purchasePrice).toFixed(2) })),
        };
      }
      case "profit": {
        const byPeriod = new Map<string, { revenue: number; cost: number }>();
        filtered.forEach((o) => {
          const k = o.createdAt.slice(0, 7);
          const cur = byPeriod.get(k) ?? { revenue: 0, cost: 0 };
          cur.revenue += o.subtotal - o.discount;
          cur.cost += o.items.reduce((s, i) => s + (costOf.get(i.productId) ?? 0) * i.quantity, 0);
          byPeriod.set(k, cur);
        });
        const data = [...byPeriod.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([period, v]) => ({
          period, revenue: +v.revenue.toFixed(2), cost: +v.cost.toFixed(2), profit: +(v.revenue - v.cost).toFixed(2),
        }));
        return { chart: "bar" as const, data: data.map((d) => ({ name: d.period, profit: d.profit })), rows: data.map((d) => ({ Month: d.period, Revenue: d.revenue, Cost: d.cost, Profit: d.profit })) };
      }
      case "payment": {
        const data = paymentBreakdown(filtered);
        return { chart: "donut" as const, data: data.map((d) => ({ name: d.method, value: d.total })), rows: data.map((d) => ({ Method: d.method, Orders: d.count, Total: d.total })) };
      }
    }
  }, [report, filtered, products.items]);

  const label = REPORTS.find((r) => r.id === report)!.label;
  const loading = orders.loading || products.loading;
  const totalRevenue = filtered.reduce((s, o) => s + o.total, 0);

  return (
    <>
      <PageHeader title="Reports & Analytics" description="Sales, inventory and profit reports"
        actions={
          <>
            <Button variant="outline" onClick={() => exportCsv(label.replace(/\W+/g, "-").toLowerCase(), view.rows)}><FileDown size={16} /> CSV</Button>
            <Button variant="outline" onClick={() => exportPdf(label, view.rows)}><FileText size={16} /> PDF</Button>
          </>
        } />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {REPORTS.map((r) => (
            <button key={r.id} onClick={() => setReport(r.id)}
              className={cn("rounded-full border px-3.5 py-1.5 text-sm", report === r.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-gray-50")}>
              {r.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2 text-sm">
          <Input type="date" className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From" />
          <span className="text-muted">to</span>
          <Input type="date" className="w-40" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To" />
          {(from || to) && <Button variant="ghost" size="sm" onClick={() => { setFrom(""); setTo(""); }}>Reset</Button>}
        </div>
      </div>

      {orders.error ? (
        <div className="rounded-2xl bg-red-50 p-6 text-sm text-red-700">{orders.error}</div>
      ) : loading ? (
        <div className="h-80 animate-pulse rounded-2xl bg-gray-100" />
      ) : (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            <Card><p className="text-xs text-muted">Revenue (selected range)</p><p className="text-xl font-semibold">{formatCurrency(totalRevenue)}</p></Card>
            <Card><p className="text-xs text-muted">Completed orders</p><p className="text-xl font-semibold">{filtered.length}</p></Card>
            <Card><p className="text-xs text-muted">Average order value</p><p className="text-xl font-semibold">{formatCurrency(filtered.length ? totalRevenue / filtered.length : 0)}</p></Card>
          </div>
          <Card className="mb-4">
            <CardTitle>{label}</CardTitle>
            {view.rows.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted">No data for the selected range.</p>
            ) : view.chart === "area" ? (
              <AreaTrend data={view.data as Record<string, string | number>[]} xKey="period" yKey="revenue" />
            ) : view.chart === "donut" ? (
              <DonutChart data={view.data as { name: string; value: number }[]} />
            ) : view.chart === "barH" ? (
              <BarSimple data={view.data as Record<string, string | number>[]} xKey="name" yKey="qty" horizontal />
            ) : (
              <BarSimple data={view.data as Record<string, string | number>[]} xKey="name" yKey={report === "profit" ? "profit" : "stock"} />
            )}
          </Card>
          {view.rows.length > 0 && (
            <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-muted">
                  <tr>{Object.keys(view.rows[0]).map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {view.rows.map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      {Object.values(r).map((v, j) => <td key={j} className="px-4 py-2.5">{v}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
