import type { Request, Response } from 'express';
import { AppError, asyncHandler } from '../middleware/errorHandler.ts';
import {
  parsePositiveIntId,
  requireNonEmptyString,
  requirePositiveNumber,
} from '../middleware/validateRequest.ts';
import {
  createFruit,
  findAllFruitsWithStock,
  findAllStock,
  findLowStock,
  updateFruit,
} from '../models/fruitModel.ts';

export const getFruits = asyncHandler(async (_req: Request, res: Response) => {
  const fruits = await findAllFruitsWithStock();
  res.status(200).json({ data: fruits });
});

export const registerFruit = asyncHandler(async (req: Request, res: Response) => {
  const fruit_name = requireNonEmptyString(req.body?.fruit_name, 'Fruit name');
  const description =
    typeof req.body?.description === 'string' ? req.body.description.trim() : '';

  const statusRaw =
    typeof req.body?.status === 'string' ? req.body.status.trim().toUpperCase() : 'ACTIVE';
  if (statusRaw !== 'ACTIVE' && statusRaw !== 'INACTIVE') {
    throw new AppError(400, 'Status must be ACTIVE or INACTIVE.');
  }

  const prices = req.body?.prices;
  if (!prices || typeof prices !== 'object') {
    throw new AppError(
      400,
      'Packaging prices object (small, medium, large) is required.'
    );
  }

  const smallPrice = requirePositiveNumber(prices.small, 'Small packaging price');
  const mediumPrice = requirePositiveNumber(prices.medium, 'Medium packaging price');
  const largePrice = requirePositiveNumber(prices.large, 'Large packaging price');

  const initialStock = req.body?.initial_stock;
  const parsedInitial = {
    small: initialStock?.small !== undefined ? Math.max(0, Number(initialStock.small)) : 0,
    medium: initialStock?.medium !== undefined ? Math.max(0, Number(initialStock.medium)) : 0,
    large: initialStock?.large !== undefined ? Math.max(0, Number(initialStock.large)) : 0,
  };

  if (
    !Number.isInteger(parsedInitial.small) ||
    !Number.isInteger(parsedInitial.medium) ||
    !Number.isInteger(parsedInitial.large)
  ) {
    throw new AppError(400, 'Initial stock quantities must be non-negative whole numbers.');
  }

  const created = await createFruit({
    fruit_name,
    description,
    status: statusRaw,
    prices: {
      small: smallPrice,
      medium: mediumPrice,
      large: largePrice,
    },
    initial_stock: parsedInitial,
  });

  res.status(201).json({
    message: 'Fruit type and packaging tiers registered successfully.',
    data: created,
  });
});

export const editFruit = asyncHandler(async (req: Request, res: Response) => {
  const fruitId = parsePositiveIntId(req.params.id, 'fruit ID');
  const payload: {
    fruit_name?: string;
    description?: string;
    status?: 'ACTIVE' | 'INACTIVE';
    prices?: { small?: number; medium?: number; large?: number };
  } = {};

  if (req.body?.fruit_name !== undefined) {
    payload.fruit_name = requireNonEmptyString(req.body.fruit_name, 'Fruit name');
  }
  if (req.body?.description !== undefined) {
    payload.description = String(req.body.description).trim();
  }
  if (req.body?.status !== undefined) {
    const statusRaw = String(req.body.status).trim().toUpperCase();
    if (statusRaw !== 'ACTIVE' && statusRaw !== 'INACTIVE') {
      throw new AppError(400, 'Status must be ACTIVE or INACTIVE.');
    }
    payload.status = statusRaw;
  }
  if (req.body?.prices && typeof req.body.prices === 'object') {
    payload.prices = {};
    if (req.body.prices.small !== undefined) {
      payload.prices.small = requirePositiveNumber(req.body.prices.small, 'Small packaging price');
    }
    if (req.body.prices.medium !== undefined) {
      payload.prices.medium = requirePositiveNumber(
        req.body.prices.medium,
        'Medium packaging price'
      );
    }
    if (req.body.prices.large !== undefined) {
      payload.prices.large = requirePositiveNumber(req.body.prices.large, 'Large packaging price');
    }
  }

  const updated = await updateFruit(fruitId, payload);
  res.status(200).json({
    message: 'Fruit details updated successfully.',
    data: updated,
  });
});

export const getStock = asyncHandler(async (_req: Request, res: Response) => {
  const stock = await findAllStock();
  res.status(200).json({ data: stock });
});

export const getLowStock = asyncHandler(async (req: Request, res: Response) => {
  const rawThreshold = req.query.threshold;
  const threshold =
    rawThreshold !== undefined ? Math.max(0, Math.floor(Number(rawThreshold))) : 10;

  if (!Number.isFinite(threshold)) {
    throw new AppError(400, 'Low stock threshold must be a valid number.');
  }

  const lowStock = await findLowStock(threshold);
  res.status(200).json({
    threshold,
    count: lowStock.length,
    data: lowStock,
  });
});
