import express from 'express';
import { registerApiRoutes } from '../server/api.ts';
import { errorHandler } from '../server/middleware/errorHandler.ts';
import { initializeDatabase } from '../server/database/init.ts';

if (
  process.env.DB_ENGINE?.toLowerCase() !== 'mysql' ||
  !process.env.DB_HOST ||
  !process.env.DB_USER ||
  !process.env.DB_PASSWORD ||
  !process.env.DB_NAME
) {
  throw new Error(
    'Configure DB_ENGINE=mysql and the hosted MySQL credentials in Vercel before using the API.'
  );
}

await initializeDatabase();

const app = express();
registerApiRoutes(app);
app.use(errorHandler);

export default app;
