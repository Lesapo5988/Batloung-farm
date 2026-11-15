import type { Request, Response } from 'express';
import { getConnectionStatus } from '../config/db.ts';
import { AppError, asyncHandler } from '../middleware/errorHandler.ts';
import {
  getCurrentStockLevels,
  getSalesRevenueByDateRange,
  getTopFiveSoldFruits,
  getTopVendorByBoxes,
  getVendorOutstandingBalances,
} from '../models/reportModel.ts';

export const getHealth = asyncHandler(async (_req: Request, res: Response) => {
  const status = getConnectionStatus();
  if (!status.connected) {
    return res.status(503).json({
      status: 'degraded',
      database: status,
    });
  }
  return res.status(200).json({
    status: 'ok',
    database: status,
  });
});

export const getTopFruitsReport = asyncHandler(async (_req: Request, res: Response) => {
  const data = await getTopFiveSoldFruits();
  res.status(200).json({ data });
});

export const getRevenueReport = asyncHandler(async (req: Request, res: Response) => {
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);

  const startDate =
    typeof req.query.startDate === 'string' && req.query.startDate.trim()
      ? req.query.startDate.trim()
      : thirtyDaysAgo;
  const endDate =
    typeof req.query.endDate === 'string' && req.query.endDate.trim()
      ? req.query.endDate.trim()
      : today;

  if (startDate > endDate) {
    throw new AppError(400, 'Start date cannot be after end date.');
  }

  const data = await getSalesRevenueByDateRange(startDate, endDate);
  res.status(200).json({ data });
});

export const getTopVendorReport = asyncHandler(async (_req: Request, res: Response) => {
  const data = await getTopVendorByBoxes();
  res.status(200).json({ data });
});

export const getStockLevelsReport = asyncHandler(async (_req: Request, res: Response) => {
  const data = await getCurrentStockLevels();
  res.status(200).json({ data });
});

export const getVendorBalancesReport = asyncHandler(async (_req: Request, res: Response) => {
  const data = await getVendorOutstandingBalances();
  res.status(200).json({ data });
});
