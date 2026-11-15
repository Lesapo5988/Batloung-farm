import type { Request, Response } from 'express';
import { AppError, asyncHandler } from '../middleware/errorHandler.ts';
import {
  parsePositiveIntId,
  requirePositiveInt,
  requirePositiveNumber,
  validatePackagingSize,
} from '../middleware/validateRequest.ts';
import {
  findAllPurchases,
  findPurchaseById,
  recordPurchase,
  type PurchaseItemInput,
} from '../models/purchaseModel.ts';

export const getPurchases = asyncHandler(async (_req: Request, res: Response) => {
  const purchases = await findAllPurchases();
  res.status(200).json({ data: purchases });
});

export const getPurchaseById = asyncHandler(async (req: Request, res: Response) => {
  const purchaseId = parsePositiveIntId(req.params.id, 'purchase ID');
  const purchase = await findPurchaseById(purchaseId);
  if (!purchase) {
    throw new AppError(404, `Purchase with ID ${purchaseId} does not exist.`);
  }
  res.status(200).json({ data: purchase });
});

export const createPurchase = asyncHandler(async (req: Request, res: Response) => {
  const supplier_id = parsePositiveIntId(req.body?.supplier_id, 'supplier ID');
  const rawItems = req.body?.items;

  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new AppError(400, 'At least one fruit item is required to record a purchase.');
  }

  const items: PurchaseItemInput[] = rawItems.map((raw, index) => {
    const label = `Purchase item #${index + 1}`;
    return {
      fruit_id: parsePositiveIntId(raw?.fruit_id, `${label} fruit ID`),
      packaging_size: validatePackagingSize(raw?.packaging_size),
      quantity: requirePositiveInt(raw?.quantity, `${label} quantity`),
      unit_cost: requirePositiveNumber(raw?.unit_cost, `${label} unit cost`),
    };
  });

  const purchase_date =
    typeof req.body?.purchase_date === 'string' ? req.body.purchase_date : undefined;

  const created = await recordPurchase({
    supplier_id,
    purchase_date,
    items,
  });

  res.status(201).json({
    message: 'Purchase recorded and stock quantities updated.',
    data: created,
  });
});
