import {
  getActiveEngine,
  getConnectionStatus,
  getSqliteInstance,
  initializeConnection,
  query,
  withTransaction,
} from '../config/db.ts';

const SQLITE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_name TEXT NOT NULL UNIQUE,
    contact_person TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    province TEXT NOT NULL CHECK (
      province IN (
        'Gauteng',
        'Free State',
        'KwaZulu-Natal',
        'Western Cape',
        'Eastern Cape',
        'Limpopo',
        'Mpumalanga',
        'North West',
        'Northern Cape'
      )
    ),
    address TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS fruits (
    fruit_id INTEGER PRIMARY KEY AUTOINCREMENT,
    fruit_name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE'))
  );

  CREATE TABLE IF NOT EXISTS vendors (
    vendor_id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_name TEXT NOT NULL,
    phone_number TEXT NOT NULL UNIQUE,
    location TEXT NOT NULL,
    registration_date TEXT NOT NULL DEFAULT (date('now'))
  );

  CREATE TABLE IF NOT EXISTS purchases (
    purchase_id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_id INTEGER NOT NULL,
    purchase_date TEXT NOT NULL DEFAULT (datetime('now')),
    total_amount REAL NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
      ON DELETE RESTRICT ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS purchase_details (
    purchase_detail_id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id INTEGER NOT NULL,
    fruit_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_cost REAL NOT NULL CHECK (unit_cost > 0),
    packaging_size TEXT NOT NULL CHECK (packaging_size IN ('small', 'medium', 'large')),
    FOREIGN KEY (purchase_id) REFERENCES purchases(purchase_id)
      ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (fruit_id) REFERENCES fruits(fruit_id)
      ON DELETE RESTRICT ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sales (
    sale_id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_id INTEGER NOT NULL,
    sale_date TEXT NOT NULL DEFAULT (datetime('now')),
    payment_method TEXT NOT NULL DEFAULT 'CASH' CHECK (payment_method IN ('CASH', 'MOBILE_MONEY', 'CREDIT')),
    payment_status TEXT NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN ('PAID', 'PARTIALLY_PAID', 'UNPAID')),
    total_amount REAL NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    amount_paid REAL NOT NULL DEFAULT 0 CHECK (amount_paid >= 0 AND amount_paid <= total_amount),
    FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id)
      ON DELETE RESTRICT ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sales_details (
    sales_detail_id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    fruit_id INTEGER NOT NULL,
    packaging_size TEXT NOT NULL CHECK (packaging_size IN ('small', 'medium', 'large')),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price REAL NOT NULL CHECK (unit_price > 0),
    FOREIGN KEY (sale_id) REFERENCES sales(sale_id)
      ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (fruit_id) REFERENCES fruits(fruit_id)
      ON DELETE RESTRICT ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS stock (
    stock_id INTEGER PRIMARY KEY AUTOINCREMENT,
    fruit_id INTEGER NOT NULL,
    packaging_size TEXT NOT NULL CHECK (packaging_size IN ('small', 'medium', 'large')),
    available_quantity INTEGER NOT NULL DEFAULT 0 CHECK (available_quantity >= 0),
    selling_price REAL NOT NULL CHECK (selling_price > 0),
    UNIQUE (fruit_id, packaging_size),
    FOREIGN KEY (fruit_id) REFERENCES fruits(fruit_id)
      ON DELETE CASCADE ON UPDATE CASCADE
  );
`;

function daysAgoIso(days: number): string {
  const d = new Date(Date.now() - days * 86400_000);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

export async function initializeDatabase(): Promise<void> {
  await initializeConnection();
  const status = getConnectionStatus();
  if (!status.connected) {
    return;
  }

  try {
    if (getActiveEngine() === 'sqlite') {
      const db = getSqliteInstance();
      if (db) {
        db.exec(SQLITE_SCHEMA);
      }
    }

    const existingFruits = await query<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM fruits');
    if ((existingFruits[0]?.cnt ?? 0) > 0) {
      return;
    }

    await withTransaction(async (tx) => {
      // Seed 6 South African Suppliers
      const suppliersData = [
        ['Ceres Valley Orchards', 'Pieter van der Merwe', '+27 23 312 4410', 'Western Cape', '14 Voortrekker Road, Ceres, 6835'],
        ['Letaba Subtropical Growers', 'Thabo Mokoena', '+27 15 307 8821', 'Limpopo', 'Plot 22, Tzaneen Valley Road, Limpopo, 0850'],
        ['Free State Fresh Produce Co.', 'Lerato Nhlapo', '+27 51 430 1194', 'Free State', '88 Nelson Mandela Drive, Bloemfontein, 9301'],
        ['Lowveld Citrus Estates', 'Sipho Dlamini', '+27 13 752 6045', 'Mpumalanga', 'KM 9 Nelspruit-White River Rd, Mbombela, 1200'],
        ['Joburg Fresh Market Hub', 'Nomsa Khumalo', '+27 11 613 2049', 'Gauteng', 'Hall 3, Heidelberg Road, City Deep, Johannesburg'],
        ['Sundays River Citrus Co-op', 'Andre Botha', '+27 42 230 0912', 'Eastern Cape', 'Main Road, Kirkwood, Eastern Cape, 6120'],
      ];

      for (const s of suppliersData) {
        await tx.execute(
          'INSERT INTO suppliers (business_name, contact_person, phone, province, address) VALUES (?, ?, ?, ?, ?)',
          s
        );
      }

      // Seed 5 Required Fruits
      const fruitsData = [
        ['Apples', 'Crisp Granny Smith and Golden Delicious orchard apples packed for retail.', 'ACTIVE'],
        ['Bananas', 'Grade-A ripe yellow Cavendish bananas harvested in subtropical estates.', 'ACTIVE'],
        ['Oranges', 'Sweet Valencia and Navel juice oranges in vented distribution crates.', 'ACTIVE'],
        ['Mangoes', 'Kent and Tommy Atkins golden mangoes sorted by box grade.', 'ACTIVE'],
        ['Grapes', 'Seedless Crimson and Thompson table grapes in cold-chain cartons.', 'ACTIVE'],
      ];

      for (const f of fruitsData) {
        await tx.execute(
          'INSERT INTO fruits (fruit_name, description, status) VALUES (?, ?, ?)',
          f
        );
      }

      // Seed Packaging-Specific Stock (Note: Apples large = 6 boxes to support low-stock & rollback verification)
      const stockData: Array<[number, 'small' | 'medium' | 'large', number, number]> = [
        [1, 'small', 42, 85.0],
        [1, 'medium', 24, 155.0],
        [1, 'large', 6, 260.0],
        [2, 'small', 55, 70.0],
        [2, 'medium', 31, 130.0],
        [2, 'large', 18, 225.0],
        [3, 'small', 48, 75.0],
        [3, 'medium', 29, 140.0],
        [3, 'large', 14, 240.0],
        [4, 'small', 19, 95.0],
        [4, 'medium', 8, 175.0],
        [4, 'large', 5, 295.0],
        [5, 'small', 26, 110.0],
        [5, 'medium', 15, 205.0],
        [5, 'large', 7, 340.0],
      ];

      for (const st of stockData) {
        await tx.execute(
          'INSERT INTO stock (fruit_id, packaging_size, available_quantity, selling_price) VALUES (?, ?, ?, ?)',
          st
        );
      }

      // Seed 6 Lesotho Vendors
      const vendorsData = [
        ['Maseru Central Stall 14', '+266 5812 3401', 'Maseru Central Market', '2026-01-12'],
        ['Thibella Fresh Corner', '+266 5944 7710', 'Thibella, Maseru', '2026-02-04'],
        ['Mafeteng Junction Traders', '+266 6201 8892', 'Mafeteng Bus Stop', '2026-02-19'],
        ['Ha Tsosane Fruit Mart', '+266 5731 0944', 'Ha Tsosane, Maseru', '2026-03-08'],
        ['Roma Campus Grocers', '+266 5890 1123', 'Roma, Maseru District', '2026-04-15'],
        ['Leribe Mini Wholesale', '+266 6311 4509', 'Hlotse, Leribe', '2026-05-22'],
      ];

      for (const v of vendorsData) {
        await tx.execute(
          'INSERT INTO vendors (vendor_name, phone_number, location, registration_date) VALUES (?, ?, ?, ?)',
          v
        );
      }

      // Seed 4 Historical Purchases
      const purchasesData: Array<{
        supplierId: number;
        date: string;
        total: number;
        items: Array<[number, number, number, 'small' | 'medium' | 'large']>;
      }> = [
        {
          supplierId: 1,
          date: daysAgoIso(18),
          total: 11400.0,
          items: [
            [1, 60, 55.0, 'small'],
            [1, 40, 105.0, 'medium'],
            [5, 20, 195.0, 'large'],
          ],
        },
        {
          supplierId: 2,
          date: daysAgoIso(12),
          total: 8950.0,
          items: [
            [2, 70, 45.0, 'small'],
            [4, 30, 120.0, 'medium'],
            [4, 11, 200.0, 'large'],
          ],
        },
        {
          supplierId: 4,
          date: daysAgoIso(7),
          total: 7400.0,
          items: [
            [3, 60, 50.0, 'small'],
            [3, 40, 95.0, 'medium'],
            [3, 4, 150.0, 'large'],
          ],
        },
        {
          supplierId: 5,
          date: daysAgoIso(3),
          total: 6250.0,
          items: [
            [1, 15, 170.0, 'large'],
            [5, 30, 75.0, 'small'],
            [2, 20, 72.5, 'medium'],
          ],
        },
      ];

      for (const p of purchasesData) {
        const res = await tx.execute(
          'INSERT INTO purchases (supplier_id, purchase_date, total_amount) VALUES (?, ?, ?)',
          [p.supplierId, p.date, p.total]
        );
        for (const item of p.items) {
          await tx.execute(
            'INSERT INTO purchase_details (purchase_id, fruit_id, quantity, unit_cost, packaging_size) VALUES (?, ?, ?, ?, ?)',
            [res.insertId, item[0], item[1], item[2], item[3]]
          );
        }
      }

      // Seed 6 Historical Sales with Cash, Mobile Money, and Credit (PAID / PARTIALLY_PAID / UNPAID)
      const salesData: Array<{
        vendorId: number;
        date: string;
        method: 'CASH' | 'MOBILE_MONEY' | 'CREDIT';
        status: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';
        total: number;
        paid: number;
        items: Array<[number, 'small' | 'medium' | 'large', number, number]>;
      }> = [
        {
          vendorId: 1,
          date: daysAgoIso(14),
          method: 'CASH',
          status: 'PAID',
          total: 3310.0,
          paid: 3310.0,
          items: [
            [1, 'small', 12, 85.0],
            [2, 'medium', 10, 130.0],
            [3, 'large', 4, 240.0],
          ],
        },
        {
          vendorId: 2,
          date: daysAgoIso(10),
          method: 'MOBILE_MONEY',
          status: 'PARTIALLY_PAID',
          total: 2935.0,
          paid: 1500.0,
          items: [
            [1, 'large', 5, 260.0],
            [4, 'medium', 6, 175.0],
            [5, 'small', 5, 110.0],
          ],
        },
        {
          vendorId: 3,
          date: daysAgoIso(6),
          method: 'CREDIT',
          status: 'UNPAID',
          total: 3515.0,
          paid: 0.0,
          items: [
            [2, 'large', 8, 225.0],
            [3, 'medium', 7, 140.0],
            [4, 'small', 7, 95.0],
          ],
        },
        {
          vendorId: 4,
          date: daysAgoIso(4),
          method: 'MOBILE_MONEY',
          status: 'PAID',
          total: 2690.0,
          paid: 2690.0,
          items: [
            [1, 'medium', 10, 155.0],
            [3, 'small', 8, 75.0],
            [5, 'medium', 2, 205.0],
          ],
        },
        {
          vendorId: 5,
          date: daysAgoIso(2),
          method: 'CASH',
          status: 'PARTIALLY_PAID',
          total: 2375.0,
          paid: 1200.0,
          items: [
            [4, 'large', 4, 295.0],
            [2, 'small', 9, 70.0],
            [5, 'small', 5, 110.0],
          ],
        },
        {
          vendorId: 1,
          date: daysAgoIso(1),
          method: 'CASH',
          status: 'PAID',
          total: 2925.0,
          paid: 2925.0,
          items: [
            [1, 'large', 4, 260.0],
            [5, 'large', 3, 340.0],
            [3, 'medium', 6, 140.0],
          ],
        },
      ];

      for (const s of salesData) {
        const res = await tx.execute(
          'INSERT INTO sales (vendor_id, sale_date, payment_method, payment_status, total_amount, amount_paid) VALUES (?, ?, ?, ?, ?, ?)',
          [s.vendorId, s.date, s.method, s.status, s.total, s.paid]
        );
        for (const item of s.items) {
          await tx.execute(
            'INSERT INTO sales_details (sale_id, fruit_id, packaging_size, quantity, unit_price) VALUES (?, ?, ?, ?, ?)',
            [res.insertId, item[0], item[1], item[2], item[3]]
          );
        }
      }
    });

    console.log('[DB] Initialized 8 tables and seeded Batloung Farm sample data');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown schema initialization error';
    console.error(`[DB] Schema initialization error: ${message}`);
  }
}
