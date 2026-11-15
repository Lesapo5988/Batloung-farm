# Batloung Farm Distribution System

**Course:** (DIWA2110) Web Application Development — Take-Home Test  
**Location:** Maseru, Lesotho  

A full-stack Fresh Produce Distribution Management System built with Node.js, Express, TypeScript, React, Tailwind CSS, and MySQL (`mysql2`) / embedded SQLite fallback.

## Project Structure

- `server/config/db.ts` — Database connection pool (`mysql2` + embedded SQLite runtime) and explicit `BEGIN` / `COMMIT` / `ROLLBACK` transaction helper
- `server/database/schema.sql` — MySQL 8+ DDL script creating `batloung_farm_db`, all 8 relational tables, constraints, and sample data
- `server/database/init.ts` — Idempotent database schema and sample data bootstrapper
- `server/models/` — Data access & SQL reporting queries (`supplierModel.ts`, `fruitModel.ts`, `vendorModel.ts`, `purchaseModel.ts`, `saleModel.ts`, `reportModel.ts`)
- `server/controllers/` — Async/await request handlers with `try/catch` error handling
- `server/routes/` — Express REST API route definitions
- `server/middleware/` — Input validation (`validateRequest.ts`) and centralized HTTP error handling (`errorHandler.ts`)
- `server.ts` — Express + Vite server entry point on port `3000`
- `src/` — React frontend dashboard (`Overview`, `Suppliers`, `Fruits & Stock`, `Vendors`, `Purchases`, `Sales & Payments`, `SQL Reports`)

## Environment Setup

Copy `.env.example` to `.env` and configure your database credentials:

- For **MySQL**: set `DB_ENGINE=mysql` along with `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME=batloung_farm_db`, then import `server/database/schema.sql`.
- For **standalone preview**: leave `DB_ENGINE=sqlite` to run automatically with the same 8-table relational schema and sample data.

## Deploying to Vercel

The Vercel configuration builds the Vite frontend and serves the Express API as a serverless function. Configure a hosted MySQL database before deploying; Vercel's serverless filesystem is not suitable for persistent SQLite data.

1. Create the MySQL database and import `server/database/schema.sql`.
2. Add these environment variables to the Vercel project for Production (and Preview if needed): `DB_ENGINE=mysql`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME`. Set `DB_SSL=true` when the provider requires TLS (including TiDB Cloud Starter).
3. Deploy the project from its root with the Vercel CLI or connect its Git repository in the Vercel dashboard.
4. Verify the deployment at `/api/health`.

## REST API Endpoints

- `GET /api/health` — Database & server health check
- `GET|POST /api/suppliers`, `GET|PUT|DELETE /api/suppliers/:id` — Supplier CRUD with purchase constraint checks
- `GET|POST /api/fruits`, `PUT /api/fruits/:id` — Fruit catalog and S/M/L selling prices
- `GET /api/stock`, `GET /api/stock/low?threshold=10` — Packaging-specific stock balances and low-stock alerts
- `GET|POST /api/vendors`, `GET /api/vendors/search?q=...`, `PUT /api/vendors/:id` — Vendor directory, search, and credit balances
- `GET|POST /api/purchases` — Multi-item supplier purchases with automatic total calculation and stock increment
- `GET|POST /api/sales`, `POST /api/sales/:id/payments` — Multi-item vendor sales with automatic pricing, atomic stock rollback, and payment tracking (`PAID`, `PARTIALLY_PAID`, `UNPAID`)
- `GET /api/reports/top-fruits`, `/api/reports/revenue`, `/api/reports/top-vendor`, `/api/reports/stock-levels`, `/api/reports/vendor-balances` — SQL analytics endpoints
