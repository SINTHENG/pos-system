"use client";

import { useMemo } from "react";
import { AlertTriangle, DollarSign, Package, Receipt, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { AreaTrend, BarSimple, DonutChart } from "@/components/charts/charts";
import { useResource } from "@/hooks/use-resource";
import { categoryService, customerService, orderService, productService, stockMovementService } from "@/services";
import { completed, dailySales, monthlyRevenue, productSales, revenueTotal, salesByCategory, stockStatus } from "@/lib/analytics";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const orders = useResource(orderService, "Order");
  const products = useResource(productService, "Product");
  const customers = useResource(customerService, "Customer");
  const categories = useResource(categoryService, "Category");
  const movements = useResource(stockMovementService, "Movement");

  const loading = orders.loading || products.loading || customers.loading || categories.loading;
  const error = orders.error || products.error || customers.error || categories.error;

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
      text: `Order ${o.id} ${o.status.toLowerCase()} - ${formatCurrency(o.total)}`,
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
      <PageHeader title="Dashboard" description="Overview of your store performance" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total Revenue" value={formatCurrency(data.revenue)} icon={DollarSign} tone="green" />
        <StatCard label="Total Sales" value={String(data.sales)} icon={Receipt} />
        <StatCard label="Total Products" value={String(products.items.length)} icon={Package} tone="blue" />
        <StatCard label="Total Customers" value={String(customers.items.length)} icon={Users} tone="amber" />
        <StatCard label="Low Stock Products" value={String(data.low.length)} icon={AlertTriangle} tone="red" />
      </div>

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

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Recent Transactions</CardTitle>
          <ul className="divide-y divide-border text-sm">
            {data.recent.map((o) => (
              <li key={o.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="font-medium">{o.id}</p>
                  <p className="text-xs text-muted">{formatDate(o.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={o.status} />
                  <span className="w-20 text-right font-medium">{formatCurrency(o.total)}</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardTitle>Best Selling Products</CardTitle>
          <ul className="divide-y divide-border text-sm">
            {data.top.map((t, i) => (
              <li key={t.productId} className="flex items-center justify-between py-2.5">
                <span>
                  <span className="mr-2 text-muted">{i + 1}.</span>
                  {t.name}
                </span>
                <span className="text-muted">
                  {t.qty} sold · <span className="font-medium text-foreground">{formatCurrency(t.revenue)}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardTitle>Low Stock Alerts</CardTitle>
          {data.low.length === 0 ? (
            <p className="text-sm text-muted">All products are well stocked.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {data.low.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5">
                  <span>{p.name}</span>
                  <span className={p.stock === 0 ? "font-medium text-red-600" : "font-medium text-amber-600"}>
                    {p.stock === 0 ? "Out of stock" : `${p.stock} left (min ${p.minStock})`}
                  </span>
                </li>
              ))}
            </ul>
          )}
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
    </>
  );
}
