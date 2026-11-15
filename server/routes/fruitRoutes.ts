import { Router } from 'express';
import {
  editFruit,
  getFruits,
  registerFruit,
} from '../controllers/fruitController.ts';

const router = Router();

router.get('/', getFruits);
router.post('/', registerFruit);
router.put('/:id', editFruit);

export default router;
