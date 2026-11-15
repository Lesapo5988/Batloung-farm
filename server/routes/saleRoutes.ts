import { Router } from 'express';
import {
  addSalePayment,
  createSale,
  getSaleById,
  getSales,
} from '../controllers/saleController.ts';

const router = Router();

router.get('/', getSales);
router.get('/:id', getSaleById);
router.post('/', createSale);
router.post('/:id/payments', addSalePayment);

export default router;
