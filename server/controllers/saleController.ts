import type { Request, Response } from 'express';
import { AppError, asyncHandler } from '../middleware/errorHandler.ts';
import {
  parsePositiveIntId,
  requirePositiveInt,
  requirePositiveNumber,
  validatePackagingSize,
  validatePaymentMethod,
} from '../middleware/validateRequest.ts';
import {
  findAllSales,
  findSaleById,
  recordSale,
  recordSalePayment,
  type SaleItemInput,
} from '../models/saleModel.ts';

export const getSales = asyncHandler(async (_req: Request, res: Response) => {
  const sales = await findAllSales();
  res.status(200).json({ data: sales });
});

export const getSaleById = asyncHandler(async (req: Request, res: Response) => {
  const saleId = parsePositiveIntId(req.params.id, 'sale ID');
  const sale = await findSaleById(saleId);
  if (!sale) {
    throw new AppError(404, `Sale with ID ${saleId} does not exist.`);
  }
  res.status(200).json({ data: sale });
});

export const createSale = asyncHandler(async (req: Request, res: Response) => {
  const vendor_id = parsePositiveIntId(req.body?.vendor_id, 'vendor ID');
  const payment_method = validatePaymentMethod(req.body?.payment_method ?? 'CASH');

  let amount_paid: number | undefined;
  if (req.body?.amount_paid !== undefined && req.body?.amount_paid !== '') {
    const parsedPaid = Number(req.body.amount_paid);
    if (!Number.isFinite(parsedPaid) || parsedPaid < 0) {
      throw new AppError(400, 'Amount paid must be a valid non-negative number.');
    }
    amount_paid = parsedPaid;
  }

  const rawItems = req.body?.items;
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new AppError(400, 'At least one fruit item is required to record a sale.');
  }

  const items: SaleItemInput[] = rawItems.map((raw, index) => {
    const label = `Sale item #${index + 1}`;
    return {
      fruit_id: parsePositiveIntId(raw?.fruit_id, `${label} fruit ID`),
      packaging_size: validatePackagingSize(raw?.packaging_size),
      quantity: requirePositiveInt(raw?.quantity, `${label} quantity`),
    };
  });

  const sale_date =
    typeof req.body?.sale_date === 'string' ? req.body.sale_date : undefined;

  const created = await recordSale({
    vendor_id,
    payment_method,
    amount_paid,
    sale_date,
    items,
  });

  res.status(201).json({
    message: 'Sale recorded, total calculated, and stock levels updated.',
    data: created,
  });
});

export const addSalePayment = asyncHandler(async (req: Request, res: Response) => {
  const saleId = parsePositiveIntId(req.params.id, 'sale ID');
  const amount = requirePositiveNumber(req.body?.amount, 'Payment amount');
  const payment_method = validatePaymentMethod(req.body?.payment_method ?? 'CASH');

  const updated = await recordSalePayment(saleId, amount, payment_method);
  res.status(200).json({
    message: `Payment of M ${amount.toFixed(2)} recorded for Sale #${saleId}.`,
    data: updated,
  });
});
