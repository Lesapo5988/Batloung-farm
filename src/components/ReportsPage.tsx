import { useEffect, useState } from 'react';
import { Code2 } from 'lucide-react';
import { api } from '../api/client';
import type {
  RevenueSummary,
  StockLevelReportRow,
  TopFruitReportRow,
  TopVendorRow,
  VendorBalanceRow,
} from '../types';
import { capitalizeSize, formatCurrency } from '../utils/format';

export function ReportsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(today);
  const [showSql, setShowSql] = useState(false);

  const [topFruits, setTopFruits] = useState<TopFruitReportRow[]>([]);
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null);
  const [topVendorData, setTopVendorData] = useState<{
    top_vendor: TopVendorRow | null;
    rankings: TopVendorRow[];
  }>({ top_vendor: null, rankings: [] });
  const [stockLevels, setStockLevels] = useState<StockLevelReportRow[]>([]);
  const [vendorBalances, setVendorBalances] = useState<VendorBalanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadReports(start: string, end: string) {
    setLoading(true);
    setError(null);
    try {
      const [tf, rev, tv, sl, vb] = await Promise.all([
        api.getTopFruits(),
        api.getRevenueReport(start, end),
        api.getTopVendorReport(),
        api.getStockLevelsReport(),
        api.getVendorBalances(),
      ]);
      setTopFruits(tf);
      setRevenue(rev);
      setTopVendorData(tv);
      setStockLevels(sl);
      setVendorBalances(vb);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to execute reporting queries.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports(startDate, endDate);
  }, []);

  function handleDateFilter() {
    loadReports(startDate, endDate);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            SQL Reporting &amp; Business Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Live SQL aggregation reports for fruit velocity, date-range revenue, vendor volume, stock, and balances
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowSql((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
        >
          <Code2 className="h-4 w-4" aria-hidden="true" />
          <span>{showSql ? 'Hide SQL Queries' : 'Inspect SQL Queries'}</span>
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Report 2: Sales Revenue During Specified Date Range */}
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              01. Sales Revenue by Date Range
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Aggregated billed revenue, cash collected, and outstanding receivables
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              aria-label="Start date"
              className="rounded-md border border-slate-300 px-2.5 py-1.5 font-mono text-xs text-slate-900"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              aria-label="End date"
              className="rounded-md border border-slate-300 px-2.5 py-1.5 font-mono text-xs text-slate-900"
            />
            <button
              type="button"
              onClick={handleDateFilter}
              disabled={loading}
              className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800"
            >
              Run Report
            </button>
          </div>
        </div>

        {showSql && (
          <pre className="overflow-x-auto border-b border-slate-200 bg-slate-900 px-6 py-3 font-mono text-xs text-slate-200">
{`SELECT COUNT(*) AS total_orders, COALESCE(SUM(total_amount), 0) AS total_revenue,
       COALESCE(SUM(amount_paid), 0) AS total_collected,
       COALESCE(SUM(total_amount - amount_paid), 0) AS total_outstanding
FROM sales WHERE DATE(sale_date) >= DATE(?) AND DATE(sale_date) <= DATE(?);`}
          </pre>
        )}

        <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-4 sm:divide-y-0">
          <div className="p-5">
            <p className="text-xs text-slate-500">Orders in Range</p>
            <p className="mt-1 font-mono text-xl font-semibold text-slate-900 tabular-nums">
              {revenue?.total_orders ?? 0}
            </p>
          </div>
          <div className="p-5">
            <p className="text-xs text-slate-500">Total Sales Revenue</p>
            <p className="mt-1 font-mono text-xl font-semibold text-slate-900 tabular-nums">
              {formatCurrency(revenue?.total_revenue ?? 0)}
            </p>
          </div>
          <div className="p-5">
            <p className="text-xs text-slate-500">Collected Cash / MoMo</p>
            <p className="mt-1 font-mono text-xl font-semibold text-emerald-700 tabular-nums">
              {formatCurrency(revenue?.total_collected ?? 0)}
            </p>
          </div>
          <div className="p-5">
            <p className="text-xs text-slate-500">Outstanding Credit</p>
            <p className="mt-1 font-mono text-xl font-semibold text-red-700 tabular-nums">
              {formatCurrency(revenue?.total_outstanding ?? 0)}
            </p>
          </div>
        </div>
      </section>

      {/* Two-Column: Report 1 (Top 5 Fruits) & Report 3 (Top Vendor by Boxes) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">
              02. Five Most Frequently Sold Fruits
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Ranked by total boxes sold and order appearances
            </p>
          </div>
          {showSql && (
            <pre className="overflow-x-auto border-b border-slate-200 bg-slate-900 px-6 py-3 font-mono text-xs text-slate-200">
{`SELECT f.fruit_id, f.fruit_name, COUNT(DISTINCT sd.sale_id) AS order_count,
       COALESCE(SUM(sd.quantity), 0) AS total_boxes_sold,
       COALESCE(SUM(sd.quantity * sd.unit_price), 0) AS total_revenue
FROM fruits f INNER JOIN sales_details sd ON sd.fruit_id = f.fruit_id
GROUP BY f.fruit_id, f.fruit_name
ORDER BY total_boxes_sold DESC, order_count DESC LIMIT 5;`}
            </pre>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                <tr>
                  <th className="px-6 py-2.5">Rank &amp; Fruit</th>
                  <th className="px-4 py-2.5 text-right">Orders</th>
                  <th className="px-4 py-2.5 text-right">Boxes Sold</th>
                  <th className="px-6 py-2.5 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topFruits.map((row, idx) => (
                  <tr key={row.fruit_id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-3 font-medium text-slate-900">
                      <span className="mr-2 font-mono text-xs text-slate-400">0{idx + 1}.</span>
                      {row.fruit_name}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700 tabular-nums">
                      {row.order_count}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                      {row.total_boxes_sold}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-slate-900 tabular-nums">
                      {formatCurrency(row.total_revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">
              03. Top Vendor by Highest Number of Boxes
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Leader:{' '}
              <span className="font-medium text-slate-800">
                {topVendorData.top_vendor
                  ? `${topVendorData.top_vendor.vendor_name} (${topVendorData.top_vendor.total_boxes_purchased} boxes)`
                  : 'No sales recorded'}
              </span>
            </p>
          </div>
          {showSql && (
            <pre className="overflow-x-auto border-b border-slate-200 bg-slate-900 px-6 py-3 font-mono text-xs text-slate-200">
{`SELECT v.vendor_id, v.vendor_name, v.location,
       COUNT(DISTINCT s.sale_id) AS total_orders,
       COALESCE(SUM(sd.quantity), 0) AS total_boxes_purchased
FROM vendors v
INNER JOIN sales s ON s.vendor_id = v.vendor_id
INNER JOIN sales_details sd ON sd.sale_id = s.sale_id
GROUP BY v.vendor_id, v.vendor_name, v.location
ORDER BY total_boxes_purchased DESC;`}
            </pre>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                <tr>
                  <th className="px-6 py-2.5">Vendor</th>
                  <th className="px-4 py-2.5 text-right">Orders</th>
                  <th className="px-4 py-2.5 text-right">Total Boxes</th>
                  <th className="px-6 py-2.5 text-right">Total Spent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topVendorData.rankings.map((row, idx) => (
                  <tr
                    key={row.vendor_id}
                    className={idx === 0 ? 'bg-emerald-50/40' : 'hover:bg-slate-50/70'}
                  >
                    <td className="px-6 py-3">
                      <div className="font-medium text-slate-900">
                        {idx === 0 ? '1st · ' : `${idx + 1}. `}
                        {row.vendor_name}
                      </div>
                      <div className="text-xs text-slate-500">{row.location}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700 tabular-nums">
                      {row.total_orders}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                      {row.total_boxes_purchased}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-slate-900 tabular-nums">
                      {formatCurrency(row.total_spent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Report 4: Current Stock Levels for Each Fruit and Packaging Size */}
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            04. Current Stock Levels per Fruit &amp; Packaging Size
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Granular inventory balances and stock valuation across small, medium, and large boxes
          </p>
        </div>
        {showSql && (
          <pre className="overflow-x-auto border-b border-slate-200 bg-slate-900 px-6 py-3 font-mono text-xs text-slate-200">
{`SELECT st.stock_id, f.fruit_name, st.packaging_size, st.available_quantity,
       st.selling_price, (st.available_quantity * st.selling_price) AS stock_value
FROM stock st INNER JOIN fruits f ON f.fruit_id = st.fruit_id
ORDER BY f.fruit_name ASC, FIELD(st.packaging_size, 'small', 'medium', 'large');`}
          </pre>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
              <tr>
                <th className="px-6 py-2.5">Fruit</th>
                <th className="px-4 py-2.5">Packaging Size</th>
                <th className="px-4 py-2.5 text-right">Available Boxes</th>
                <th className="px-4 py-2.5 text-right">Unit Selling Price</th>
                <th className="px-6 py-2.5 text-right">Inventory Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stockLevels.map((row) => (
                <tr key={row.stock_id} className="hover:bg-slate-50/70">
                  <td className="px-6 py-2.5 font-medium text-slate-900">{row.fruit_name}</td>
                  <td className="px-4 py-2.5 text-slate-700">
                    {capitalizeSize(row.packaging_size)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-900 tabular-nums">
                    {row.available_quantity}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-slate-700 tabular-nums">
                    {formatCurrency(row.selling_price)}
                  </td>
                  <td className="px-6 py-2.5 text-right font-mono text-slate-900 tabular-nums">
                    {formatCurrency(row.stock_value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Report 5: Vendor Outstanding Balances */}
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            05. Vendor Outstanding Balances Ledger
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Accounts receivable summary across all registered Lesotho vendors
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
              <tr>
                <th className="px-6 py-2.5">Vendor</th>
                <th className="px-4 py-2.5 text-right">Unpaid / Partial</th>
                <th className="px-4 py-2.5 text-right">Total Billed</th>
                <th className="px-4 py-2.5 text-right">Total Paid</th>
                <th className="px-6 py-2.5 text-right">Outstanding Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vendorBalances.map((v) => (
                <tr key={v.vendor_id} className="hover:bg-slate-50/70">
                  <td className="px-6 py-2.5">
                    <div className="font-medium text-slate-900">{v.vendor_name}</div>
                    <div className="text-xs text-slate-500">
                      {v.location} · {v.phone_number}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-700 tabular-nums">
                    {v.unpaid_orders} unpaid / {v.partial_orders} partial
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-slate-900 tabular-nums">
                    {formatCurrency(v.total_billed)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-emerald-700 tabular-nums">
                    {formatCurrency(v.total_paid)}
                  </td>
                  <td
                    className={`px-6 py-2.5 text-right font-mono font-semibold tabular-nums ${
                      v.outstanding_balance > 0 ? 'text-red-700' : 'text-slate-600'
                    }`}
                  >
                    {formatCurrency(v.outstanding_balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
