import type { Request, Response } from 'express';
import { AppError, asyncHandler } from '../middleware/errorHandler.ts';
import {
  parsePositiveIntId,
  requireNonEmptyString,
  validateProvince,
} from '../middleware/validateRequest.ts';
import {
  createSupplier,
  deleteSupplier,
  findAllSuppliers,
  findSupplierById,
  updateSupplier,
} from '../models/supplierModel.ts';

export const getSuppliers = asyncHandler(async (_req: Request, res: Response) => {
  const suppliers = await findAllSuppliers();
  res.status(200).json({ data: suppliers });
});

export const getSupplierById = asyncHandler(async (req: Request, res: Response) => {
  const supplierId = parsePositiveIntId(req.params.id, 'supplier ID');
  const supplier = await findSupplierById(supplierId);
  if (!supplier) {
    throw new AppError(404, `Supplier with ID ${supplierId} does not exist.`);
  }
  res.status(200).json({ data: supplier });
});

export const registerSupplier = asyncHandler(async (req: Request, res: Response) => {
  const business_name = requireNonEmptyString(req.body?.business_name, 'Business name');
  const contact_person = requireNonEmptyString(req.body?.contact_person, 'Contact person');
  const phone = requireNonEmptyString(req.body?.phone, 'Phone');
  const province = validateProvince(req.body?.province);
  const address = requireNonEmptyString(req.body?.address, 'Address');

  const supplier = await createSupplier({
    business_name,
    contact_person,
    phone,
    province,
    address,
  });

  res.status(201).json({
    message: 'Supplier registered successfully.',
    data: supplier,
  });
});

export const editSupplier = asyncHandler(async (req: Request, res: Response) => {
  const supplierId = parsePositiveIntId(req.params.id, 'supplier ID');
  const updates: Record<string, string> = {};

  if (req.body?.business_name !== undefined) {
    updates.business_name = requireNonEmptyString(req.body.business_name, 'Business name');
  }
  if (req.body?.contact_person !== undefined) {
    updates.contact_person = requireNonEmptyString(req.body.contact_person, 'Contact person');
  }
  if (req.body?.phone !== undefined) {
    updates.phone = requireNonEmptyString(req.body.phone, 'Phone');
  }
  if (req.body?.province !== undefined) {
    updates.province = validateProvince(req.body.province);
  }
  if (req.body?.address !== undefined) {
    updates.address = requireNonEmptyString(req.body.address, 'Address');
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError(400, 'Provide at least one supplier field to update.');
  }

  const updated = await updateSupplier(supplierId, updates);
  res.status(200).json({
    message: 'Supplier updated successfully.',
    data: updated,
  });
});

export const removeSupplier = asyncHandler(async (req: Request, res: Response) => {
  const supplierId = parsePositiveIntId(req.params.id, 'supplier ID');
  await deleteSupplier(supplierId);
  res.status(200).json({
    message: `Supplier #${supplierId} deleted successfully.`,
  });
});
