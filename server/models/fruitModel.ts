import { query, withTransaction } from '../config/db.ts';
import { AppError } from '../middleware/errorHandler.ts';
import type { PackagingSize } from '../middleware/validateRequest.ts';

export interface StockRow {
  stock_id: number;
  fruit_id: number;
  fruit_name: string;
  fruit_status: 'ACTIVE' | 'INACTIVE';
  packaging_size: PackagingSize;
  available_quantity: number;
  selling_price: number;
}

export interface FruitWithStock {
  fruit_id: number;
  fruit_name: string;
  description: string;
  status: 'ACTIVE' | 'INACTIVE';
  total_boxes: number;
  packaging: {
    small: { stock_id: number; available_quantity: number; selling_price: number };
    medium: { stock_id: number; available_quantity: number; selling_price: number };
    large: { stock_id: number; available_quantity: number; selling_price: number };
  };
}

export interface CreateFruitInput {
  fruit_name: string;
  description: string;
  status?: 'ACTIVE' | 'INACTIVE';
  prices: {
    small: number;
    medium: number;
    large: number;
  };
  initial_stock?: {
    small?: number;
    medium?: number;
    large?: number;
  };
}

export interface UpdateFruitInput {
  fruit_name?: string;
  description?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  prices?: {
    small?: number;
    medium?: number;
    large?: number;
  };
}

export async function findAllFruitsWithStock(): Promise<FruitWithStock[]> {
  const fruits = await query<{
    fruit_id: number;
    fruit_name: string;
    description: string;
    status: 'ACTIVE' | 'INACTIVE';
  }>('SELECT fruit_id, fruit_name, description, status FROM fruits ORDER BY fruit_name ASC');

  const stockRows = await query<{
    stock_id: number;
    fruit_id: number;
    packaging_size: PackagingSize;
    available_quantity: number;
    selling_price: number;
  }>('SELECT stock_id, fruit_id, packaging_size, available_quantity, selling_price FROM stock');

  return fruits.map((fruit) => {
    const bySize = new Map<PackagingSize, { stock_id: number; available_quantity: number; selling_price: number }>();
    for (const row of stockRows) {
      if (row.fruit_id === fruit.fruit_id) {
        bySize.set(row.packaging_size, {
          stock_id: Number(row.stock_id),
          available_quantity: Number(row.available_quantity),
          selling_price: Number(row.selling_price),
        });
      }
    }

    const small = bySize.get('small') ?? { stock_id: 0, available_quantity: 0, selling_price: 0 };
    const medium = bySize.get('medium') ?? { stock_id: 0, available_quantity: 0, selling_price: 0 };
    const large = bySize.get('large') ?? { stock_id: 0, available_quantity: 0, selling_price: 0 };

    return {
      ...fruit,
      total_boxes: small.available_quantity + medium.available_quantity + large.available_quantity,
      packaging: { small, medium, large },
    };
  });
}

export async function findFruitById(fruitId: number): Promise<FruitWithStock | null> {
  const all = await findAllFruitsWithStock();
  return all.find((f) => f.fruit_id === fruitId) ?? null;
}

export async function createFruit(input: CreateFruitInput): Promise<FruitWithStock> {
  const fruitId = await withTransaction(async (tx) => {
    const res = await tx.execute(
      'INSERT INTO fruits (fruit_name, description, status) VALUES (?, ?, ?)',
      [input.fruit_name, input.description, input.status ?? 'ACTIVE']
    );
    const newId = res.insertId;

    const sizes: PackagingSize[] = ['small', 'medium', 'large'];
    for (const size of sizes) {
      const qty = Math.max(0, Math.floor(Number(input.initial_stock?.[size] ?? 0)));
      const price = Number(input.prices[size]);
      await tx.execute(
        'INSERT INTO stock (fruit_id, packaging_size, available_quantity, selling_price) VALUES (?, ?, ?, ?)',
        [newId, size, qty, price]
      );
    }
    return newId;
  });

  const created = await findFruitById(fruitId);
  if (!created) {
    throw new AppError(500, 'Failed to load created fruit record.');
  }
  return created;
}

export async function updateFruit(
  fruitId: number,
  input: UpdateFruitInput
): Promise<FruitWithStock> {
  const existing = await findFruitById(fruitId);
  if (!existing) {
    throw new AppError(404, `Fruit with ID ${fruitId} not found.`);
  }

  await withTransaction(async (tx) => {
    await tx.execute(
      'UPDATE fruits SET fruit_name = ?, description = ?, status = ? WHERE fruit_id = ?',
      [
        input.fruit_name ?? existing.fruit_name,
        input.description ?? existing.description,
        input.status ?? existing.status,
        fruitId,
      ]
    );

    if (input.prices) {
      const sizes: PackagingSize[] = ['small', 'medium', 'large'];
      for (const size of sizes) {
        const nextPrice = input.prices[size];
        if (nextPrice !== undefined) {
          await tx.execute(
            'UPDATE stock SET selling_price = ? WHERE fruit_id = ? AND packaging_size = ?',
            [Number(nextPrice), fruitId, size]
          );
        }
      }
    }
  });

  const updated = await findFruitById(fruitId);
  if (!updated) {
    throw new AppError(404, `Fruit with ID ${fruitId} not found.`);
  }
  return updated;
}

export async function findAllStock(): Promise<StockRow[]> {
  return query<StockRow>(
    `SELECT
       st.stock_id,
       st.fruit_id,
       f.fruit_name,
       f.status AS fruit_status,
       st.packaging_size,
       st.available_quantity,
       st.selling_price
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
}

export async function findLowStock(threshold = 10): Promise<StockRow[]> {
  return query<StockRow>(
    `SELECT
       st.stock_id,
       st.fruit_id,
       f.fruit_name,
       f.status AS fruit_status,
       st.packaging_size,
       st.available_quantity,
       st.selling_price
     FROM stock st
     INNER JOIN fruits f ON f.fruit_id = st.fruit_id
     WHERE st.available_quantity <= ? AND f.status = 'ACTIVE'
     ORDER BY st.available_quantity ASC, f.fruit_name ASC`,
    [threshold]
  );
}
