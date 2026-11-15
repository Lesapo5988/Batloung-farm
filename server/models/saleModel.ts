import { query, withTransaction } from '../config/db.ts';
import { AppError } from '../middleware/errorHandler.ts';
import type {
  PackagingSize,
  PaymentMethod,
  PaymentStatus,
} from '../middleware/validateRequest.ts';

export interface SaleItemInput {
  fruit_id: number;
  packaging_size: PackagingSize;
  quantity: number;
}

export interface CreateSaleInput {
  vendor_id: number;
  payment_method: PaymentMethod;
  amount_paid?: number;
  sale_date?: string;
  items: SaleItemInput[];
}

export interface SaleDetailRecord {
  sales_detail_id: number;
  sale_id: number;
  fruit_id: number;
  fruit_name: string;
  packaging_size: PackagingSize;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface SaleRecord {
  sale_id: number;
  vendor_id: number;
  vendor_name: string;
  vendor_phone: string;
  vendor_location: string;
  sale_date: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  total_amount: number;
  amount_paid: number;
  outstanding_balance: number;
  total_boxes: number;
  items: SaleDetailRecord[];
}

export function determinePaymentStatus(totalAmount: number, amountPaid: number): PaymentStatus {
  if (amountPaid <= 0) {
    return 'UNPAID';
  }
  if (amountPaid + 0.001 >= totalAmount) {
    return 'PAID';
  }
  return 'PARTIALLY_PAID';
}

export async function findAllSales(): Promise<SaleRecord[]> {
  const sales = await query<{
    sale_id: number;
    vendor_id: number;
    vendor_name: string;
    vendor_phone: string;
    vendor_location: string;
    sale_date: string;
    payment_method: PaymentMethod;
    payment_status: PaymentStatus;
    total_amount: number;
    amount_paid: number;
  }>(
    `SELECT
       s.sale_id,
       s.vendor_id,
       v.vendor_name,
       v.phone_number AS vendor_phone,
       v.location AS vendor_location,
       s.sale_date,
       s.payment_method,
       s.payment_status,
       s.total_amount,
       s.amount_paid
     FROM sales s
     INNER JOIN vendors v ON v.vendor_id = s.vendor_id
     ORDER BY s.sale_date DESC, s.sale_id DESC`
  );

  const details = await query<{
    sales_detail_id: number;
    sale_id: number;
    fruit_id: number;
    fruit_name: string;
    packaging_size: PackagingSize;
    quantity: number;
    unit_price: number;
  }>(
    `SELECT
       sd.sales_detail_id,
       sd.sale_id,
       sd.fruit_id,
       f.fruit_name,
       sd.packaging_size,
       sd.quantity,
       sd.unit_price
     FROM sales_details sd
     INNER JOIN fruits f ON f.fruit_id = sd.fruit_id
     ORDER BY sd.sales_detail_id ASC`
  );

  const detailsBySale = new Map<number, SaleDetailRecord[]>();
  for (const d of details) {
    const list = detailsBySale.get(d.sale_id) ?? [];
    const qty = Number(d.quantity);
    const price = Number(d.unit_price);
    list.push({
      ...d,
      quantity: qty,
      unit_price: price,
      line_total: Number((qty * price).toFixed(2)),
    });
    detailsBySale.set(d.sale_id, list);
  }

  return sales.map((s) => {
    const items = detailsBySale.get(s.sale_id) ?? [];
    const totalAmount = Number(s.total_amount);
    const amountPaid = Number(s.amount_paid);
    return {
      ...s,
      total_amount: totalAmount,
      amount_paid: amountPaid,
      outstanding_balance: Number(Math.max(0, totalAmount - amountPaid).toFixed(2)),
      total_boxes: items.reduce((acc, item) => acc + item.quantity, 0),
      items,
    };
  });
}

export async function findSaleById(saleId: number): Promise<SaleRecord | null> {
  const all = await findAllSales();
  return all.find((s) => s.sale_id === saleId) ?? null;
}

export async function recordSale(input: CreateSaleInput): Promise<SaleRecord> {
  const saleDate =
    input.sale_date && input.sale_date.trim().length > 0
      ? input.sale_date.trim()
      : new Date().toISOString().slice(0, 19).replace('T', ' ');

  const saleId = await withTransaction(async (tx) => {
    // 1. Verify vendor exists
    const vendors = await tx.query<{ vendor_id: number; vendor_name: string }>(
      'SELECT vendor_id, vendor_name FROM vendors WHERE vendor_id = ?',
      [input.vendor_id]
    );
    if (vendors.length === 0) {
      throw new AppError(404, `Vendor with ID ${input.vendor_id} not found.`);
    }

    // 2. Check availability and fetch authoritative unit prices for ALL items before mutating anything.
    // Also track cumulative quantity per (fruit_id, packaging_size) in case an order repeats a SKU.
    const requestedTotals = new Map<string, number>();
    const resolvedItems: Array<{
      fruit_id: number;
      fruit_name: string;
      packaging_size: PackagingSize;
      quantity: number;
      unit_price: number;
    }> = [];

    let calculatedTotal = 0;

    for (let idx = 0; idx < input.items.length; idx++) {
      const item = input.items[idx];
      const stockRows = await tx.query<{
        stock_id: number;
        available_quantity: number;
        selling_price: number;
        fruit_name: string;
        fruit_status: string;
      }>(
        `SELECT
           st.stock_id,
           st.available_quantity,
           st.selling_price,
           f.fruit_name,
           f.status AS fruit_status
         FROM stock st
         INNER JOIN fruits f ON f.fruit_id = st.fruit_id
         WHERE st.fruit_id = ? AND st.packaging_size = ?`,
        [item.fruit_id, item.packaging_size]
      );

      if (stockRows.length === 0) {
        throw new AppError(
          404,
          `Item #${idx + 1}: Fruit ID ${item.fruit_id} (${item.packaging_size}) does not exist in stock. Transaction rolled back.`
        );
      }

      const stockRow = stockRows[0];
      if (stockRow.fruit_status !== 'ACTIVE') {
        throw new AppError(
          400,
          `${stockRow.fruit_name} is currently inactive and cannot be sold. Transaction rolled back.`
        );
      }

      const key = `${item.fruit_id}:${item.packaging_size}`;
      const cumulativeQty = (requestedTotals.get(key) ?? 0) + item.quantity;
      requestedTotals.set(key, cumulativeQty);

      const available = Number(stockRow.available_quantity);
      if (cumulativeQty > available) {
        throw new AppError(
          400,
          `Insufficient stock for ${stockRow.fruit_name} (${item.packaging_size}): requested ${cumulativeQty} box(es), only ${available} box(es) available. Entire sale rolled back without reducing stock.`
        );
      }

      const unitPrice = Number(stockRow.selling_price);
      calculatedTotal += item.quantity * unitPrice;

      resolvedItems.push({
        fruit_id: item.fruit_id,
        fruit_name: stockRow.fruit_name,
        packaging_size: item.packaging_size,
        quantity: item.quantity,
        unit_price: unitPrice,
      });
    }

    calculatedTotal = Number(calculatedTotal.toFixed(2));

    // 3. Determine payment amount & status (PAID, PARTIALLY_PAID, UNPAID)
    let amountPaid: number;
    if (input.amount_paid !== undefined && input.amount_paid !== null) {
      amountPaid = Number(Number(input.amount_paid).toFixed(2));
    } else if (input.payment_method === 'CREDIT') {
      amountPaid = 0;
    } else {
      amountPaid = calculatedTotal;
    }

    if (!Number.isFinite(amountPaid) || amountPaid < 0) {
      throw new AppError(400, 'Amount paid cannot be negative.');
    }
    if (amountPaid > calculatedTotal) {
      throw new AppError(
        400,
        `Amount paid (${amountPaid.toFixed(2)}) cannot exceed total sale amount (${calculatedTotal.toFixed(2)}).`
      );
    }

    const paymentStatus = determinePaymentStatus(calculatedTotal, amountPaid);

    // 4. Insert sale header
    const saleInsert = await tx.execute(
      `INSERT INTO sales (vendor_id, sale_date, payment_method, payment_status, total_amount, amount_paid)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [input.vendor_id, saleDate, input.payment_method, paymentStatus, calculatedTotal, amountPaid]
    );
    const newSaleId = saleInsert.insertId;

    // 5. Insert sales_details and safely deduct stock (preventing negative stock)
    for (const item of resolvedItems) {
      await tx.execute(
        `INSERT INTO sales_details (sale_id, fruit_id, packaging_size, quantity, unit_price)
         VALUES (?, ?, ?, ?, ?)`,
        [newSaleId, item.fruit_id, item.packaging_size, item.quantity, item.unit_price]
      );

      const stockUpdate = await tx.execute(
        `UPDATE stock
         SET available_quantity = available_quantity - ?
         WHERE fruit_id = ? AND packaging_size = ? AND available_quantity >= ?`,
        [item.quantity, item.fruit_id, item.packaging_size, item.quantity]
      );

      if (stockUpdate.affectedRows === 0) {
        throw new AppError(
          400,
          `Stock deduction failed for ${item.fruit_name} (${item.packaging_size}) due to insufficient stock. Transaction rolled back.`
        );
      }
    }

    return newSaleId;
  });

  const created = await findSaleById(saleId);
  if (!created) {
    throw new AppError(500, 'Failed to load recorded sale.');
  }
  return created;
}

export async function recordSalePayment(
  saleId: number,
  paymentAmount: number,
  paymentMethod: PaymentMethod
): Promise<SaleRecord> {
  if (paymentMethod === 'CREDIT') {
    throw new AppError(400, 'Settlement payment must use CASH or MOBILE_MONEY.');
  }

  await withTransaction(async (tx) => {
    const rows = await tx.query<{
      sale_id: number;
      total_amount: number;
      amount_paid: number;
      payment_status: PaymentStatus;
    }>('SELECT sale_id, total_amount, amount_paid, payment_status FROM sales WHERE sale_id = ?', [
      saleId,
    ]);

    if (rows.length === 0) {
      throw new AppError(404, `Sale with ID ${saleId} not found.`);
    }

    const sale = rows[0];
    const totalAmount = Number(sale.total_amount);
    const currentPaid = Number(sale.amount_paid);
    const remaining = Number((totalAmount - currentPaid).toFixed(2));

    if (remaining <= 0) {
      throw new AppError(400, `Sale #${saleId} is already fully paid.`);
    }

    if (paymentAmount > remaining + 0.001) {
      throw new AppError(
        400,
        `Payment of ${paymentAmount.toFixed(2)} exceeds remaining balance of ${remaining.toFixed(2)}.`
      );
    }

    const nextPaid = Number(Math.min(totalAmount, currentPaid + paymentAmount).toFixed(2));
    const nextStatus = determinePaymentStatus(totalAmount, nextPaid);

    await tx.execute(
      `UPDATE sales
       SET amount_paid = ?,
           payment_status = ?,
           payment_method = ?
       WHERE sale_id = ?`,
      [nextPaid, nextStatus, paymentMethod, saleId]
    );
  });

  const updated = await findSaleById(saleId);
  if (!updated) {
    throw new AppError(404, `Sale with ID ${saleId} not found.`);
  }
  return updated;
}
