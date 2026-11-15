import { Router } from 'express';
import {
  getHealth,
  getRevenueReport,
  getStockLevelsReport,
  getTopFruitsReport,
  getTopVendorReport,
  getVendorBalancesReport,
} from '../controllers/reportController.ts';

const router = Router();

router.get('/health', getHealth);
router.get('/top-fruits', getTopFruitsReport);
router.get('/revenue', getRevenueReport);
router.get('/top-vendor', getTopVendorReport);
router.get('/stock-levels', getStockLevelsReport);
router.get('/vendor-balances', getVendorBalancesReport);

export default router;
