import { execute, query } from '../config/db.ts';
import { AppError } from '../middleware/errorHandler.ts';

export interface VendorRecord {
  vendor_id: number;
  vendor_name: string;
  phone_number: string;
  location: string;
  registration_date: string;
  total_orders: number;
  total_purchased: number;
  total_paid: number;
  outstanding_balance: number;
}

export interface VendorInput {
  vendor_name: string;
  phone_number: string;
  location: string;
  registration_date?: string;
}

const VENDOR_BASE_SELECT = `
  SELECT
    v.vendor_id,
    v.vendor_name,
    v.phone_number,
    v.location,
    v.registration_date,
    COUNT(s.sale_id) AS total_orders,
    COALESCE(SUM(s.total_amount), 0) AS total_purchased,
    COALESCE(SUM(s.amount_paid), 0) AS total_paid,
    COALESCE(SUM(s.total_amount - s.amount_paid), 0) AS outstanding_balance
  FROM vendors v
  LEFT JOIN sales s ON s.vendor_id = v.vendor_id
`;

export async function findAllVendors(searchTerm?: string): Promise<VendorRecord[]> {
  if (searchTerm && searchTerm.trim().length > 0) {
    const pattern = `%${searchTerm.trim()}%`;
    return query<VendorRecord>(
      `${VENDOR_BASE_SELECT}
       WHERE LOWER(v.vendor_name) LIKE LOWER(?)
          OR LOWER(v.phone_number) LIKE LOWER(?)
          OR LOWER(v.location) LIKE LOWER(?)
       GROUP BY v.vendor_id, v.vendor_name, v.phone_number, v.location, v.registration_date
       ORDER BY v.vendor_name ASC`,
      [pattern, pattern, pattern]
    );
  }

  return query<VendorRecord>(
    `${VENDOR_BASE_SELECT}
     GROUP BY v.vendor_id, v.vendor_name, v.phone_number, v.location, v.registration_date
     ORDER BY v.vendor_name ASC`
  );
}

export async function findVendorById(vendorId: number): Promise<VendorRecord | null> {
  const rows = await query<VendorRecord>(
    `${VENDOR_BASE_SELECT}
     WHERE v.vendor_id = ?
     GROUP BY v.vendor_id, v.vendor_name, v.phone_number, v.location, v.registration_date`,
    [vendorId]
  );
  return rows[0] ?? null;
}

export async function createVendor(input: VendorInput): Promise<VendorRecord> {
  const regDate = input.registration_date || new Date().toISOString().slice(0, 10);
  const res = await execute(
    `INSERT INTO vendors (vendor_name, phone_number, location, registration_date)
     VALUES (?, ?, ?, ?)`,
    [input.vendor_name, input.phone_number, input.location, regDate]
  );

  const created = await findVendorById(res.insertId);
  if (!created) {
    throw new AppError(500, 'Failed to retrieve newly registered vendor.');
  }
  return created;
}

export async function updateVendor(
  vendorId: number,
  input: Partial<VendorInput>
): Promise<VendorRecord> {
  const existing = await findVendorById(vendorId);
  if (!existing) {
    throw new AppError(404, `Vendor with ID ${vendorId} not found.`);
  }

  await execute(
    `UPDATE vendors
     SET vendor_name = ?,
         phone_number = ?,
         location = ?,
         registration_date = ?
     WHERE vendor_id = ?`,
    [
      input.vendor_name ?? existing.vendor_name,
      input.phone_number ?? existing.phone_number,
      input.location ?? existing.location,
      input.registration_date ?? existing.registration_date,
      vendorId,
    ]
  );

  const updated = await findVendorById(vendorId);
  if (!updated) {
    throw new AppError(404, `Vendor with ID ${vendorId} not found.`);
  }
  return updated;
}
