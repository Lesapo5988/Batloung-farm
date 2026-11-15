import { ArrowUpRight } from 'lucide-react';
import type { FruitWithStock, Purchase, Sale, StockRow, Vendor } from '../types';
import { formatCurrency, formatDateTime, formatPaymentMethod } from '../utils/format';
import { PaymentStatusText, StockLevelText } from './StatusText';

interface OverviewPageProps {
  fruits: FruitWithStock[];
  lowStock: StockRow[];
  sales: Sale[];
  purchases: Purchase[];
  vendors: Vendor[];
  onNavigate: (tab: 'suppliers' | 'fruits' | 'vendors' | 'purchases' | 'sales' | 'reports') => void;
  onOpenNewPurchase: () => void;
  onOpenNewSale: () => void;
}

export function OverviewPage({
  fruits,
  lowStock,
  sales,
  purchases,
  vendors,
  onNavigate,
  onOpenNewPurchase,
  onOpenNewSale,
}: OverviewPageProps) {
  const totalBoxesInStock = fruits.reduce((sum, f) => sum + f.total_boxes, 0);
  const totalSalesRevenue = sales.reduce((sum, s) => sum + s.total_amount, 0);
  const totalOutstanding = vendors.reduce((sum, v) => sum + v.outstanding_balance, 0);
  const totalProcurement = purchases.reduce((sum, p) => sum + p.total_amount, 0);

  return (
    <div className="space-y-8">
      {/* Regional Context Header */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Maseru, Lesotho · Wholesale &amp; Street Vendor Distribution · Currency: LSL (Maloti)
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Distribution Operations Overview
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenNewPurchase}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            Record Purchase
          </button>
          <button
            type="button"
            onClick={onOpenNewSale}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 transition-colors whitespace-nowrap shrink-0"
          >
            Record Sale
          </button>
        </div>
      </div>

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Available Stock</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {totalBoxesInStock.toLocaleString()} boxes
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Across {fruits.length} fruit types · S / M / L tiers
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Total Sales Revenue</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {formatCurrency(totalSalesRevenue)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {sales.length} vendor orders · {formatCurrency(totalProcurement)} procured
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Outstanding Vendor Credit</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {formatCurrency(totalOutstanding)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {vendors.filter((v) => v.outstanding_balance > 0).length} vendor(s) with open balance
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Low-Stock Packaging Tiers</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {lowStock.length} SKU{lowStock.length === 1 ? '' : 's'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            At or below 10 boxes threshold
          </p>
        </div>
      </div>

      {/* Packaging-Specific Stock Matrix */}
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Stock Levels by Fruit &amp; Packaging Size
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Separate box inventory and unit selling prices for small, medium, and large crates
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('fruits')}
            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 whitespace-nowrap shrink-0"
          >
            <span>Manage Inventory</span>
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
              <tr>
                <th className="px-6 py-3">Fruit</th>
                <th className="px-4 py-3 text-right">Small Boxes</th>
                <th className="px-4 py-3 text-right">Medium Boxes</th>
                <th className="px-4 py-3 text-right">Large Boxes</th>
                <th className="px-6 py-3 text-right">Total Boxes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fruits.map((fruit) => (
                <tr key={fruit.fruit_id} className="hover:bg-slate-50/70">
                  <td className="px-6 py-3">
                    <div className="font-medium text-slate-900">{fruit.fruit_name}</div>
                    <div className="text-xs text-slate-500">{fruit.status}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    <div className="font-medium text-slate-900">
                      {fruit.packaging.small.available_quantity}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatCurrency(fruit.packaging.small.selling_price)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    <div className="font-medium text-slate-900">
                      {fruit.packaging.medium.available_quantity}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatCurrency(fruit.packaging.medium.selling_price)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    <div
                      className={`font-medium ${
                        fruit.packaging.large.available_quantity <= 10
                          ? 'text-amber-700'
                          : 'text-slate-900'
                      }`}
                    >
                      {fruit.packaging.large.available_quantity}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatCurrency(fruit.packaging.large.selling_price)}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                    {fruit.total_boxes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Two-Column Operational Activity: Low Stock Alerts + Recent Sales */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Low-Stock Replenishment Queue</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Packaging tiers with 10 or fewer boxes remaining
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenNewPurchase}
              className="text-xs font-medium text-emerald-700 hover:text-emerald-800 whitespace-nowrap shrink-0"
            >
              Restock via Purchase
            </button>
          </div>
          {lowStock.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-500">
              All fruit packaging sizes are above the 10-box threshold.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                  <tr>
                    <th className="px-6 py-2.5">Fruit &amp; Size</th>
                    <th className="px-4 py-2.5">State</th>
                    <th className="px-6 py-2.5 text-right">Available</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lowStock.map((item) => (
                    <tr key={item.stock_id} className="hover:bg-slate-50/70">
                      <td className="px-6 py-3 font-medium text-slate-900">
                        {item.fruit_name}{' '}
                        <span className="text-xs font-normal text-slate-500 capitalize">
                          · {item.packaging_size}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StockLevelText quantity={item.available_quantity} />
                      </td>
                      <td className="px-6 py-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                        {item.available_quantity} boxes
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Recent Vendor Sales</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Latest invoices and settlement status
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('sales')}
              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 whitespace-nowrap shrink-0"
            >
              <span>View All Sales</span>
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                <tr>
                  <th className="px-6 py-2.5">Vendor</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-6 py-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales.slice(0, 6).map((sale) => (
                  <tr key={sale.sale_id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-3">
                      <div className="font-medium text-slate-900">{sale.vendor_name}</div>
                      <div className="text-xs text-slate-500">
                        {formatDateTime(sale.sale_date)} · {formatPaymentMethod(sale.payment_method)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <PaymentStatusText status={sale.payment_status} />
                    </td>
                    <td className="px-6 py-3 text-right font-mono tabular-nums">
                      <div className="font-medium text-slate-900">
                        {formatCurrency(sale.total_amount)}
                      </div>
                      {sale.outstanding_balance > 0 && (
                        <div className="text-xs text-red-700">
                          Due {formatCurrency(sale.outstanding_balance)}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
