import dotenv from 'dotenv';
import express from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { initializeDatabase } from './server/database/init.ts';
import { errorHandler, notFoundHandler } from './server/middleware/errorHandler.ts';
import supplierRoutes from './server/routes/supplierRoutes.ts';
import fruitRoutes from './server/routes/fruitRoutes.ts';
import stockRoutes from './server/routes/stockRoutes.ts';
import vendorRoutes from './server/routes/vendorRoutes.ts';
import purchaseRoutes from './server/routes/purchaseRoutes.ts';
import saleRoutes from './server/routes/saleRoutes.ts';
import reportRoutes from './server/routes/reportRoutes.ts';
import { getHealth } from './server/controllers/reportController.ts';

dotenv.config();

async function startServer() {
  await initializeDatabase();

  const app = express();
  const PORT = Number(process.env.PORT || 3000);
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // REST API Routes
  app.get('/api/health', getHealth);
  app.use('/api/suppliers', supplierRoutes);
  app.use('/api/fruits', fruitRoutes);
  app.use('/api/stock', stockRoutes);
  app.use('/api/vendors', vendorRoutes);
  app.use('/api/purchases', purchaseRoutes);
  app.use('/api/sales', saleRoutes);
  app.use('/api/reports', reportRoutes);

  // Unknown API endpoints return 404 JSON
  app.use('/api/*', notFoundHandler);

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.use(errorHandler);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Batloung Farm Distribution System listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
