import express, { type Express } from 'express';
import { getHealth } from './controllers/reportController.ts';
import { notFoundHandler } from './middleware/errorHandler.ts';
import supplierRoutes from './routes/supplierRoutes.ts';
import fruitRoutes from './routes/fruitRoutes.ts';
import stockRoutes from './routes/stockRoutes.ts';
import vendorRoutes from './routes/vendorRoutes.ts';
import purchaseRoutes from './routes/purchaseRoutes.ts';
import saleRoutes from './routes/saleRoutes.ts';
import reportRoutes from './routes/reportRoutes.ts';

export function registerApiRoutes(app: Express): void {
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/api/health', getHealth);
  app.use('/api/suppliers', supplierRoutes);
  app.use('/api/fruits', fruitRoutes);
  app.use('/api/stock', stockRoutes);
  app.use('/api/vendors', vendorRoutes);
  app.use('/api/purchases', purchaseRoutes);
  app.use('/api/sales', saleRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/*', notFoundHandler);
}
