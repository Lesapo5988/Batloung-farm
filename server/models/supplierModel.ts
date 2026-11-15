import { execute, query } from '../config/db.ts';
import { AppError } from '../middleware/errorHandler.ts';

export interface SupplierRecord {
  supplier_id: number;
  business_name: string;
  contact_person: string;
  phone: string;
  province: string;
  address: string;
  created_at: string;
  purchase_count?: number;
  total_supplied?: number;
}

export interface SupplierInput {
  business_name: string;
  contact_person: string;
  phone: string;
  province: string;
  address: string;
}

export async function findAllSuppliers(): Promise<SupplierRecord[]> {
  return query<SupplierRecord>(
    `SELECT
       s.supplier_id,
       s.business_name,
       s.contact_person,
       s.phone,
       s.province,
       s.address,
       s.created_at,
       COUNT(p.purchase_id) AS purchase_count,
       COALESCE(SUM(p.total_amount), 0) AS total_supplied
     FROM suppliers s
     LEFT JOIN purchases p ON p.supplier_id = s.supplier_id
     GROUP BY s.supplier_id, s.business_name, s.contact_person, s.phone, s.province, s.address, s.created_at
     ORDER BY s.business_name ASC`
  );
}

export async function findSupplierById(supplierId: number): Promise<SupplierRecord | null> {
  const rows = await query<SupplierRecord>(
    `SELECT
       s.supplier_id,
       s.business_name,
       s.contact_person,
       s.phone,
       s.province,
       s.address,
       s.created_at,
       COUNT(p.purchase_id) AS purchase_count,
       COALESCE(SUM(p.total_amount), 0) AS total_supplied
     FROM suppliers s
     LEFT JOIN purchases p ON p.supplier_id = s.supplier_id
     WHERE s.supplier_id = ?
     GROUP BY s.supplier_id, s.business_name, s.contact_person, s.phone, s.province, s.address, s.created_at`,
    [supplierId]
  );
  return rows[0] ?? null;
}

export async function createSupplier(input: SupplierInput): Promise<SupplierRecord> {
  const result = await execute(
    `INSERT INTO suppliers (business_name, contact_person, phone, province, address)
     VALUES (?, ?, ?, ?, ?)`,
    [input.business_name, input.contact_person, input.phone, input.province, input.address]
  );
  const created = await findSupplierById(result.insertId);
  if (!created) {
    throw new AppError(500, 'Failed to retrieve newly created supplier.');
  }
  return created;
}

export async function updateSupplier(
  supplierId: number,
  input: Partial<SupplierInput>
): Promise<SupplierRecord> {
  const existing = await findSupplierById(supplierId);
  if (!existing) {
    throw new AppError(404, `Supplier with ID ${supplierId} not found.`);
  }

  await execute(
    `UPDATE suppliers
     SET business_name = ?,
         contact_person = ?,
         phone = ?,
         province = ?,
         address = ?
     WHERE supplier_id = ?`,
    [
      input.business_name ?? existing.business_name,
      input.contact_person ?? existing.contact_person,
      input.phone ?? existing.phone,
      input.province ?? existing.province,
      input.address ?? existing.address,
      supplierId,
    ]
  );

  const updated = await findSupplierById(supplierId);
  if (!updated) {
    throw new AppError(404, `Supplier with ID ${supplierId} not found.`);
  }
  return updated;
}

export async function deleteSupplier(supplierId: number): Promise<void> {
  const existing = await findSupplierById(supplierId);
  if (!existing) {
    throw new AppError(404, `Supplier with ID ${supplierId} not found.`);
  }

  const purchases = await query<{ cnt: number }>(
    'SELECT COUNT(*) AS cnt FROM purchases WHERE supplier_id = ?',
    [supplierId]
  );

  if ((purchases[0]?.cnt ?? 0) > 0) {
    throw new AppError(
      409,
      `Cannot delete "${existing.business_name}" because it has ${purchases[0].cnt} recorded purchase(s). Historical supply records must be preserved.`
    );
  }

  await execute('DELETE FROM suppliers WHERE supplier_id = ?', [supplierId]);
}
