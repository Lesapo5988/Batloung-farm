import type { Request, Response } from 'express';
import { AppError, asyncHandler } from '../middleware/errorHandler.ts';
import {
  parsePositiveIntId,
  requireNonEmptyString,
} from '../middleware/validateRequest.ts';
import {
  createVendor,
  findAllVendors,
  findVendorById,
  updateVendor,
} from '../models/vendorModel.ts';

export const getVendors = asyncHandler(async (req: Request, res: Response) => {
  const search = typeof req.query.q === 'string' ? req.query.q : undefined;
  const vendors = await findAllVendors(search);
  res.status(200).json({ data: vendors });
});

export const searchVendors = asyncHandler(async (req: Request, res: Response) => {
  const term =
    typeof req.query.q === 'string'
      ? req.query.q
      : typeof req.query.query === 'string'
        ? req.query.query
        : '';

  if (!term.trim()) {
    const all = await findAllVendors();
    return res.status(200).json({ data: all });
  }

  const matches = await findAllVendors(term);
  return res.status(200).json({ data: matches });
});

export const getVendorById = asyncHandler(async (req: Request, res: Response) => {
  const vendorId = parsePositiveIntId(req.params.id, 'vendor ID');
  const vendor = await findVendorById(vendorId);
  if (!vendor) {
    throw new AppError(404, `Vendor with ID ${vendorId} does not exist.`);
  }
  res.status(200).json({ data: vendor });
});

export const registerVendor = asyncHandler(async (req: Request, res: Response) => {
  const vendor_name = requireNonEmptyString(req.body?.vendor_name, 'Vendor name');
  const phone_number = requireNonEmptyString(req.body?.phone_number, 'Phone number');
  const location = requireNonEmptyString(req.body?.location, 'Location');
  const registration_date =
    typeof req.body?.registration_date === 'string' && req.body.registration_date.trim()
      ? req.body.registration_date.trim()
      : undefined;

  const created = await createVendor({
    vendor_name,
    phone_number,
    location,
    registration_date,
  });

  res.status(201).json({
    message: 'Vendor registered successfully.',
    data: created,
  });
});

export const editVendor = asyncHandler(async (req: Request, res: Response) => {
  const vendorId = parsePositiveIntId(req.params.id, 'vendor ID');
  const updates: Record<string, string> = {};

  if (req.body?.vendor_name !== undefined) {
    updates.vendor_name = requireNonEmptyString(req.body.vendor_name, 'Vendor name');
  }
  if (req.body?.phone_number !== undefined) {
    updates.phone_number = requireNonEmptyString(req.body.phone_number, 'Phone number');
  }
  if (req.body?.location !== undefined) {
    updates.location = requireNonEmptyString(req.body.location, 'Location');
  }
  if (req.body?.registration_date !== undefined) {
    updates.registration_date = requireNonEmptyString(
      req.body.registration_date,
      'Registration date'
    );
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError(400, 'Provide at least one vendor field to update.');
  }

  const updated = await updateVendor(vendorId, updates);
  res.status(200).json({
    message: 'Vendor details updated successfully.',
    data: updated,
  });
});
