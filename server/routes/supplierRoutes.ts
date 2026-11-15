import { Router } from 'express';
import {
  editSupplier,
  getSupplierById,
  getSuppliers,
  registerSupplier,
  removeSupplier,
} from '../controllers/supplierController.ts';

const router = Router();

router.get('/', getSuppliers);
router.get('/:id', getSupplierById);
router.post('/', registerSupplier);
router.put('/:id', editSupplier);
router.delete('/:id', removeSupplier);

export default router;
