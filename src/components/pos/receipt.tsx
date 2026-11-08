import type { Customer, Order } from "@/types";
import type { StoreSettings } from "@/store/settings-store";
import { formatCurrency, formatDate } from "@/lib/utils";

export function Receipt({ order, customer, settings }: { order: Order; customer?: Customer; settings: StoreSettings }) {
  const money = (n: number) => formatCurrency(n, settings.currency);
  return (
    <div className="print-area mx-auto w-full max-w-xs bg-white p-4 font-mono text-xs text-black">
      <div className="text-center">
        {settings.showReceiptLogo && settings.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={settings.logoUrl} alt="logo" className="mx-auto mb-2 h-12" />
        )}
        <p className="text-sm font-bold">{settings.storeName}</p>
        <p>{settings.address}</p>
        <p>{settings.phone}</p>
        {settings.receiptHeader && <p className="mt-1">{settings.receiptHeader}</p>}
      </div>
      <hr className="my-2 border-dashed border-black" />
      <p>Order: {order.id}</p>
      <p>Date: {formatDate(order.createdAt)}</p>
      <p>Customer: {customer?.name ?? "Walk-in Customer"}</p>
      <p>Payment: {order.paymentMethod}</p>
      <hr className="my-2 border-dashed border-black" />
      {order.items.map((i) => (
        <div key={i.productId} className="mb-1">
          <p>{i.name}</p>
          <p className="flex justify-between">
            <span>
              {i.quantity} x {money(i.price)}
            </span>
            <span>{money(i.quantity * i.price)}</span>
          </p>
        </div>
      ))}
      <hr className="my-2 border-dashed border-black" />
      <p className="flex justify-between"><span>Subtotal</span><span>{money(order.subtotal)}</span></p>
      {order.discount > 0 && <p className="flex justify-between"><span>Discount</span><span>-{money(order.discount)}</span></p>}
      <p className="flex justify-between"><span>Tax</span><span>{money(order.tax)}</span></p>
      <p className="flex justify-between text-sm font-bold"><span>TOTAL</span><span>{money(order.total)}</span></p>
      <hr className="my-2 border-dashed border-black" />
      <p className="text-center">{settings.receiptFooter}</p>
    </div>
  );
}
