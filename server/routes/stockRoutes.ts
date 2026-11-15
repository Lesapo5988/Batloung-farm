import { Router } from 'express';
import { getLowStock, getStock } from '../controllers/fruitController.ts';

const router = Router();

router.get('/', getStock);
router.get('/low', getLowStock);

export default router;
