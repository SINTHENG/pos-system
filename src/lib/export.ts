/** Downloads rows as a CSV file. */
export function exportCsv(filename: string, rows: Record<string, string | number>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [headers.map(esc).join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Opens the browser print dialog with a simple table — choose "Save as PDF" to export a PDF. */
export function exportPdf(title: string, rows: Record<string, string | number>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  const th = headers.map((h) => `<th>${h}</th>`).join("");
  const body = rows.map((r) => `<tr>${headers.map((h) => `<td>${r[h]}</td>`).join("")}</tr>`).join("");
  w.document.write(`<html><head><title>${title}</title><style>
    body{font-family:system-ui,sans-serif;padding:24px}
    table{border-collapse:collapse;width:100%;font-size:12px}
    th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}
    th{background:#f3f4f6}
  </style></head><body><h2>${title}</h2><table><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table></body></html>`);
  w.document.close();
  w.focus();
  w.print();
}
