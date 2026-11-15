import { query, withTransaction } from '../config/db.ts';
import { AppError } from '../middleware/errorHandler.ts';
import type { PackagingSize } from '../middleware/validateRequest.ts';

export interface PurchaseItemInput {
  fruit_id: number;
  packaging_size: PackagingSize;
  quantity: number;
  unit_cost: number;
}

export interface CreatePurchaseInput {
  supplier_id: number;
  purchase_date?: string;
  items: PurchaseItemInput[];
}

export interface PurchaseDetailRecord {
  purchase_detail_id: number;
  purchase_id: number;
  fruit_id: number;
  fruit_name: string;
  packaging_size: PackagingSize;
  quantity: number;
  unit_cost: number;
  line_total: number;
}

export interface PurchaseRecord {
  purchase_id: number;
  supplier_id: number;
  business_name: string;
  province: string;
  purchase_date: string;
  total_amount: number;
  total_boxes: number;
  items: PurchaseDetailRecord[];
}

export async function findAllPurchases(): Promise<PurchaseRecord[]> {
  const purchases = await query<{
    purchase_id: number;
    supplier_id: number;
    business_name: string;
    province: string;
    purchase_date: string;
    total_amount: number;
  }>(
    `SELECT
       p.purchase_id,
       p.supplier_id,
       s.business_name,
       s.province,
       p.purchase_date,
       p.total_amount
     FROM purchases p
     INNER JOIN suppliers s ON s.supplier_id = p.supplier_id
     ORDER BY p.purchase_date DESC, p.purchase_id DESC`
  );

  const details = await query<{
    purchase_detail_id: number;
    purchase_id: number;
    fruit_id: number;
    fruit_name: string;
    packaging_size: PackagingSize;
    quantity: number;
    unit_cost: number;
  }>(
    `SELECT
       pd.purchase_detail_id,
       pd.purchase_id,
       pd.fruit_id,
       f.fruit_name,
       pd.packaging_size,
       pd.quantity,
       pd.unit_cost
     FROM purchase_details pd
     INNER JOIN fruits f ON f.fruit_id = pd.fruit_id
     ORDER BY pd.purchase_detail_id ASC`
  );

  const detailsByPurchase = new Map<number, PurchaseDetailRecord[]>();
  for (const d of details) {
    const list = detailsByPurchase.get(d.purchase_id) ?? [];
    list.push({
      ...d,
      quantity: Number(d.quantity),
      unit_cost: Number(d.unit_cost),
      line_total: Number((Number(d.quantity) * Number(d.unit_cost)).toFixed(2)),
    });
    detailsByPurchase.set(d.purchase_id, list);
  }

  return purchases.map((p) => {
    const items = detailsByPurchase.get(p.purchase_id) ?? [];
    const totalBoxes = items.reduce((acc, item) => acc + item.quantity, 0);
    return {
      ...p,
      total_amount: Number(p.total_amount),
      total_boxes: totalBoxes,
      items,
    };
  });
}

export async function findPurchaseById(purchaseId: number): Promise<PurchaseRecord | null> {
  const all = await findAllPurchases();
  return all.find((p) => p.purchase_id === purchaseId) ?? null;
}

export async function recordPurchase(input: CreatePurchaseInput): Promise<PurchaseRecord> {
  const purchaseDate =
    input.purchase_date && input.purchase_date.trim().length > 0
      ? input.purchase_date.trim()
      : new Date().toISOString().slice(0, 19).replace('T', ' ');

  const purchaseId = await withTransaction(async (tx) => {
    // 1. Verify supplier exists
    const suppliers = await tx.query<{ supplier_id: number; business_name: string }>(
      'SELECT supplier_id, business_name FROM suppliers WHERE supplier_id = ?',
      [input.supplier_id]
    );
    if (suppliers.length === 0) {
      throw new AppError(404, `Supplier with ID ${input.supplier_id} not found.`);
    }

    // 2. Validate every item & compute total purchase amount automatically
    let calculatedTotal = 0;
    for (let idx = 0; idx < input.items.length; idx++) {
      const item = input.items[idx];
      const fruits = await tx.query<{ fruit_id: number; fruit_name: string }>(
        'SELECT fruit_id, fruit_name FROM fruits WHERE fruit_id = ?',
        [item.fruit_id]
      );
      if (fruits.length === 0) {
        throw new AppError(
          404,
          `Purchase item #${idx + 1} references unknown fruit ID ${item.fruit_id}. Transaction rolled back.`
        );
      }

      const stockRows = await tx.query<{ stock_id: number }>(
        'SELECT stock_id FROM stock WHERE fruit_id = ? AND packaging_size = ?',
        [item.fruit_id, item.packaging_size]
      );
      if (stockRows.length === 0) {
        throw new AppError(
          400,
          `No stock configuration exists for ${fruits[0].fruit_name} (${item.packaging_size}). Transaction rolled back.`
        );
      }

      calculatedTotal += item.quantity * item.unit_cost;
    }

    calculatedTotal = Number(calculatedTotal.toFixed(2));

    // 3. Insert purchase header
    const purchaseInsert = await tx.execute(
      'INSERT INTO purchases (supplier_id, purchase_date, total_amount) VALUES (?, ?, ?)',
      [input.supplier_id, purchaseDate, calculatedTotal]
    );
    const newPurchaseId = purchaseInsert.insertId;

    // 4. Insert purchase details and increment packaging-specific stock
    for (const item of input.items) {
      await tx.execute(
        `INSERT INTO purchase_details (purchase_id, fruit_id, quantity, unit_cost, packaging_size)
         VALUES (?, ?, ?, ?, ?)`,
        [newPurchaseId, item.fruit_id, item.quantity, item.unit_cost, item.packaging_size]
      );

      await tx.execute(
        `UPDATE stock
         SET available_quantity = available_quantity + ?
         WHERE fruit_id = ? AND packaging_size = ?`,
        [item.quantity, item.fruit_id, item.packaging_size]
      );
    }

    return newPurchaseId;
  });

  const created = await findPurchaseById(purchaseId);
  if (!created) {
    throw new AppError(500, 'Failed to load recorded purchase.');
  }
  return created;
}
