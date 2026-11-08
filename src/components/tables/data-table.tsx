"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Inbox, Search, TriangleAlert } from "lucide-react";
import { Input } from "@/components/ui/fields";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  /** value used for sorting; omit to disable sorting on this column */
  sortValue?: (row: T) => string | number;
  className?: string;
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  loading,
  error,
  onRetry,
  searchText,
  searchPlaceholder = "Search...",
  filters,
  pageSize = 10,
  emptyMessage = "No records found.",
  onRowClick,
  initialSearch = "",
}: {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  /** returns a string the search box matches against */
  searchText?: (row: T) => string;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  pageSize?: number;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  initialSearch?: string;
}) {
  const [query, setQuery] = useState(initialSearch);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(1);

  const processed = useMemo(() => {
    let out = rows;
    const q = query.trim().toLowerCase();
    if (q && searchText) out = out.filter((r) => searchText(r).toLowerCase().includes(q));
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.sortValue) {
        const sv = col.sortValue;
        out = [...out].sort((a, b) => {
          const x = sv(a);
          const y = sv(b);
          const cmp = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
          return sort.dir === "asc" ? cmp : -cmp;
        });
      }
    }
    return out;
  }, [rows, query, sort, columns, searchText]);

  const pages = Math.max(1, Math.ceil(processed.length / pageSize));
  const current = Math.min(page, pages);
  const visible = processed.slice((current - 1) * pageSize, current * pageSize);

  function toggleSort(col: Column<T>) {
    if (!col.sortValue) return;
    setSort((s) =>
      s?.key === col.key ? (s.dir === "asc" ? { key: col.key, dir: "desc" } : null) : { key: col.key, dir: "asc" },
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      {(searchText || filters) && (
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          {searchText && (
            <div className="relative min-w-52 flex-1 sm:max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={searchPlaceholder}
                className="pl-9"
              />
            </div>
          )}
          {filters}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-muted">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  onClick={() => toggleSort(c)}
                  className={cn(
                    "whitespace-nowrap px-4 py-3 font-medium",
                    c.sortValue && "cursor-pointer select-none hover:text-foreground",
                    c.className,
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {c.header}
                    {sort?.key === c.key && (sort.dir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i} className="border-t border-border">
                  {columns.map((c) => (
                    <td key={c.key} className="px-4 py-3">
                      <div className="h-4 animate-pulse rounded bg-gray-100" />
                    </td>
                  ))}
                </tr>
              ))}
            {!loading &&
              visible.map((row) => (
                <tr
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn("border-t border-border", onRowClick && "cursor-pointer hover:bg-gray-50")}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={cn("px-4 py-3", c.className)}>
                      {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {!loading && error && (
        <div className="flex flex-col items-center gap-2 p-10 text-sm text-red-600">
          <TriangleAlert />
          {error}
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          )}
        </div>
      )}
      {!loading && !error && processed.length === 0 && (
        <div className="flex flex-col items-center gap-2 p-10 text-sm text-muted">
          <Inbox />
          {emptyMessage}
        </div>
      )}

      {!loading && !error && processed.length > 0 && (
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted">
          <span>
            Showing {(current - 1) * pageSize + 1}-{Math.min(current * pageSize, processed.length)} of{" "}
            {processed.length}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={current <= 1} onClick={() => setPage(current - 1)}>
              <ChevronLeft size={14} />
            </Button>
            <span>
              {current} / {pages}
            </span>
            <Button variant="outline" size="sm" disabled={current >= pages} onClick={() => setPage(current + 1)}>
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
