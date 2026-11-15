import { Router } from 'express';
import {
  editVendor,
  getVendorById,
  getVendors,
  registerVendor,
  searchVendors,
} from '../controllers/vendorController.ts';

const router = Router();

router.get('/', getVendors);
router.get('/search', searchVendors);
router.get('/:id', getVendorById);
router.post('/', registerVendor);
router.put('/:id', editVendor);

export default router;
