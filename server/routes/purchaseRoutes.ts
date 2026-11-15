import { Router } from 'express';
import {
  createPurchase,
  getPurchaseById,
  getPurchases,
} from '../controllers/purchaseController.ts';

const router = Router();

router.get('/', getPurchases);
router.get('/:id', getPurchaseById);
router.post('/', createPurchase);

export default router;
