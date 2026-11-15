import { query } from '../config/db.ts';
import type { PackagingSize } from '../middleware/validateRequest.ts';

export interface TopFruitReportRow {
  fruit_id: number;
  fruit_name: string;
  order_count: number;
  total_boxes_sold: number;
  total_revenue: number;
}

export interface RevenueSummary {
  start_date: string;
  end_date: string;
  total_orders: number;
  total_revenue: number;
  total_collected: number;
  total_outstanding: number;
  daily_breakdown: Array<{
    sale_day: string;
    orders: number;
    revenue: number;
    collected: number;
  }>;
}

export interface TopVendorRow {
  vendor_id: number;
  vendor_name: string;
  phone_number: string;
  location: string;
  total_orders: number;
  total_boxes_purchased: number;
  total_spent: number;
}

export interface StockLevelReportRow {
  stock_id: number;
  fruit_id: number;
  fruit_name: string;
  packaging_size: PackagingSize;
  available_quantity: number;
  selling_price: number;
  stock_value: number;
}

export interface VendorBalanceRow {
  vendor_id: number;
  vendor_name: string;
  phone_number: string;
  location: string;
  total_orders: number;
  total_billed: number;
  total_paid: number;
  outstanding_balance: number;
  unpaid_orders: number;
  partial_orders: number;
}

export async function getTopFiveSoldFruits(): Promise<TopFruitReportRow[]> {
  const rows = await query<TopFruitReportRow>(
    `SELECT
       f.fruit_id,
       f.fruit_name,
       COUNT(DISTINCT sd.sale_id) AS order_count,
       COALESCE(SUM(sd.quantity), 0) AS total_boxes_sold,
       COALESCE(SUM(sd.quantity * sd.unit_price), 0) AS total_revenue
     FROM fruits f
     INNER JOIN sales_details sd ON sd.fruit_id = f.fruit_id
     GROUP BY f.fruit_id, f.fruit_name
     ORDER BY total_boxes_sold DESC, order_count DESC
     LIMIT 5`
  );
  return rows.map((r) => ({
    ...r,
    order_count: Number(r.order_count),
    total_boxes_sold: Number(r.total_boxes_sold),
    total_revenue: Number(r.total_revenue),
  }));
}

export async function getSalesRevenueByDateRange(
  startDate: string,
  endDate: string
): Promise<RevenueSummary> {
  const summaryRows = await query<{
    total_orders: number;
    total_revenue: number;
    total_collected: number;
    total_outstanding: number;
  }>(
    `SELECT
       COUNT(*) AS total_orders,
       COALESCE(SUM(total_amount), 0) AS total_revenue,
       COALESCE(SUM(amount_paid), 0) AS total_collected,
       COALESCE(SUM(total_amount - amount_paid), 0) AS total_outstanding
     FROM sales
     WHERE DATE(sale_date) >= DATE(?) AND DATE(sale_date) <= DATE(?)`,
    [startDate, endDate]
  );

  const dailyRows = await query<{
    sale_day: string;
    orders: number;
    revenue: number;
    collected: number;
  }>(
    `SELECT
       DATE(sale_date) AS sale_day,
       COUNT(*) AS orders,
       COALESCE(SUM(total_amount), 0) AS revenue,
       COALESCE(SUM(amount_paid), 0) AS collected
     FROM sales
     WHERE DATE(sale_date) >= DATE(?) AND DATE(sale_date) <= DATE(?)
     GROUP BY DATE(sale_date)
     ORDER BY sale_day ASC`,
    [startDate, endDate]
  );

  const summary = summaryRows[0] ?? {
    total_orders: 0,
    total_revenue: 0,
    total_collected: 0,
    total_outstanding: 0,
  };

  return {
    start_date: startDate,
    end_date: endDate,
    total_orders: Number(summary.total_orders),
    total_revenue: Number(summary.total_revenue),
    total_collected: Number(summary.total_collected),
    total_outstanding: Number(summary.total_outstanding),
    daily_breakdown: dailyRows.map((d) => ({
      sale_day: String(d.sale_day),
      orders: Number(d.orders),
      revenue: Number(d.revenue),
      collected: Number(d.collected),
    })),
  };
}

export async function getTopVendorByBoxes(): Promise<{
  top_vendor: TopVendorRow | null;
  rankings: TopVendorRow[];
}> {
  const rows = await query<TopVendorRow>(
    `SELECT
       v.vendor_id,
       v.vendor_name,
       v.phone_number,
       v.location,
       COUNT(DISTINCT s.sale_id) AS total_orders,
       COALESCE(SUM(sd.quantity), 0) AS total_boxes_purchased,
       COALESCE((
         SELECT SUM(s2.total_amount)
         FROM sales s2
         WHERE s2.vendor_id = v.vendor_id
       ), 0) AS total_spent
     FROM vendors v
     INNER JOIN sales s ON s.vendor_id = v.vendor_id
     INNER JOIN sales_details sd ON sd.sale_id = s.sale_id
     GROUP BY v.vendor_id, v.vendor_name, v.phone_number, v.location
     ORDER BY total_boxes_purchased DESC, total_spent DESC`
  );

  const normalized = rows.map((r) => ({
    ...r,
    total_orders: Number(r.total_orders),
    total_boxes_purchased: Number(r.total_boxes_purchased),
    total_spent: Number(r.total_spent),
  }));

  return {
    top_vendor: normalized[0] ?? null,
    rankings: normalized,
  };
}

export async function getCurrentStockLevels(): Promise<StockLevelReportRow[]> {
  const rows = await query<StockLevelReportRow>(
    `SELECT
       st.stock_id,
       st.fruit_id,
       f.fruit_name,
       st.packaging_size,
       st.available_quantity,
       st.selling_price,
       (st.available_quantity * st.selling_price) AS stock_value
     FROM stock st
     INNER JOIN fruits f ON f.fruit_id = st.fruit_id
     ORDER BY f.fruit_name ASC,
       CASE st.packaging_size
         WHEN 'small' THEN 1
         WHEN 'medium' THEN 2
         WHEN 'large' THEN 3
         ELSE 4
       END ASC`
  );

  return rows.map((r) => ({
    ...r,
    available_quantity: Number(r.available_quantity),
    selling_price: Number(r.selling_price),
    stock_value: Number(Number(r.stock_value).toFixed(2)),
  }));
}

export async function getVendorOutstandingBalances(): Promise<VendorBalanceRow[]> {
  const rows = await query<VendorBalanceRow>(
    `SELECT
       v.vendor_id,
       v.vendor_name,
       v.phone_number,
       v.location,
       COUNT(s.sale_id) AS total_orders,
       COALESCE(SUM(s.total_amount), 0) AS total_billed,
       COALESCE(SUM(s.amount_paid), 0) AS total_paid,
       COALESCE(SUM(s.total_amount - s.amount_paid), 0) AS outstanding_balance,
       SUM(CASE WHEN s.payment_status = 'UNPAID' THEN 1 ELSE 0 END) AS unpaid_orders,
       SUM(CASE WHEN s.payment_status = 'PARTIALLY_PAID' THEN 1 ELSE 0 END) AS partial_orders
     FROM vendors v
     LEFT JOIN sales s ON s.vendor_id = v.vendor_id
     GROUP BY v.vendor_id, v.vendor_name, v.phone_number, v.location
     ORDER BY outstanding_balance DESC, v.vendor_name ASC`
  );

  return rows.map((r) => ({
    ...r,
    total_orders: Number(r.total_orders),
    total_billed: Number(r.total_billed),
    total_paid: Number(r.total_paid),
    outstanding_balance: Number(r.outstanding_balance),
    unpaid_orders: Number(r.unpaid_orders || 0),
    partial_orders: Number(r.partial_orders || 0),
  }));
}
