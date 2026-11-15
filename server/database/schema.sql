-- ============================================================================
-- Batloung Farm Distribution System - MySQL 8+ Database Schema & Seed Script
-- Course: (DIWA2110) Web Application Development
-- Location: Maseru, Lesotho
-- ============================================================================

CREATE DATABASE IF NOT EXISTS batloung_farm_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE batloung_farm_db;

-- 1. Suppliers Table (South African Provinces)
CREATE TABLE IF NOT EXISTS suppliers (
  supplier_id INT AUTO_INCREMENT PRIMARY KEY,
  business_name VARCHAR(120) NOT NULL,
  contact_person VARCHAR(100) NOT NULL,
  phone VARCHAR(25) NOT NULL,
  province VARCHAR(60) NOT NULL,
  address VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_suppliers_business_name UNIQUE (business_name),
  CONSTRAINT uq_suppliers_phone UNIQUE (phone),
  CONSTRAINT chk_suppliers_province CHECK (
    province IN (
      'Gauteng',
      'Free State',
      'KwaZulu-Natal',
      'Western Cape',
      'Eastern Cape',
      'Limpopo',
      'Mpumalanga',
      'North West',
      'Northern Cape'
    )
  )
);

-- 2. Fruits Table
CREATE TABLE IF NOT EXISTS fruits (
  fruit_id INT AUTO_INCREMENT PRIMARY KEY,
  fruit_name VARCHAR(80) NOT NULL,
  description VARCHAR(255) NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  CONSTRAINT uq_fruits_name UNIQUE (fruit_name),
  CONSTRAINT chk_fruits_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

-- 3. Vendors Table (Street vendors & small retailers in Lesotho)
CREATE TABLE IF NOT EXISTS vendors (
  vendor_id INT AUTO_INCREMENT PRIMARY KEY,
  vendor_name VARCHAR(120) NOT NULL,
  phone_number VARCHAR(25) NOT NULL,
  location VARCHAR(120) NOT NULL,
  registration_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  CONSTRAINT uq_vendors_phone UNIQUE (phone_number)
);

-- 4. Purchases Table
CREATE TABLE IF NOT EXISTS purchases (
  purchase_id INT AUTO_INCREMENT PRIMARY KEY,
  supplier_id INT NOT NULL,
  purchase_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  CONSTRAINT fk_purchases_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_purchases_total CHECK (total_amount >= 0)
);

-- 5. Purchase Details Table
CREATE TABLE IF NOT EXISTS purchase_details (
  purchase_detail_id INT AUTO_INCREMENT PRIMARY KEY,
  purchase_id INT NOT NULL,
  fruit_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_cost DECIMAL(10, 2) NOT NULL,
  packaging_size VARCHAR(10) NOT NULL,
  CONSTRAINT fk_purchase_details_purchase
    FOREIGN KEY (purchase_id) REFERENCES purchases(purchase_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_purchase_details_fruit
    FOREIGN KEY (fruit_id) REFERENCES fruits(fruit_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_purchase_details_qty CHECK (quantity > 0),
  CONSTRAINT chk_purchase_details_cost CHECK (unit_cost > 0),
  CONSTRAINT chk_purchase_details_size CHECK (packaging_size IN ('small', 'medium', 'large'))
);

-- 6. Sales Table (Includes payment method & balance tracking)
CREATE TABLE IF NOT EXISTS sales (
  sale_id INT AUTO_INCREMENT PRIMARY KEY,
  vendor_id INT NOT NULL,
  sale_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  payment_method VARCHAR(20) NOT NULL DEFAULT 'CASH',
  payment_status VARCHAR(20) NOT NULL DEFAULT 'UNPAID',
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  amount_paid DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  CONSTRAINT fk_sales_vendor
    FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_sales_method CHECK (payment_method IN ('CASH', 'MOBILE_MONEY', 'CREDIT')),
  CONSTRAINT chk_sales_status CHECK (payment_status IN ('PAID', 'PARTIALLY_PAID', 'UNPAID')),
  CONSTRAINT chk_sales_total CHECK (total_amount >= 0),
  CONSTRAINT chk_sales_paid CHECK (amount_paid >= 0 AND amount_paid <= total_amount)
);

-- 7. Sales Details Table
CREATE TABLE IF NOT EXISTS sales_details (
  sales_detail_id INT AUTO_INCREMENT PRIMARY KEY,
  sale_id INT NOT NULL,
  fruit_id INT NOT NULL,
  packaging_size VARCHAR(10) NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  CONSTRAINT fk_sales_details_sale
    FOREIGN KEY (sale_id) REFERENCES sales(sale_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_sales_details_fruit
    FOREIGN KEY (fruit_id) REFERENCES fruits(fruit_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_sales_details_size CHECK (packaging_size IN ('small', 'medium', 'large')),
  CONSTRAINT chk_sales_details_qty CHECK (quantity > 0),
  CONSTRAINT chk_sales_details_price CHECK (unit_price > 0)
);

-- 8. Stock Table (Separates small, medium, and large packaging per fruit)
CREATE TABLE IF NOT EXISTS stock (
  stock_id INT AUTO_INCREMENT PRIMARY KEY,
  fruit_id INT NOT NULL,
  packaging_size VARCHAR(10) NOT NULL,
  available_quantity INT NOT NULL DEFAULT 0,
  selling_price DECIMAL(10, 2) NOT NULL,
  CONSTRAINT fk_stock_fruit
    FOREIGN KEY (fruit_id) REFERENCES fruits(fruit_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT uq_stock_fruit_size UNIQUE (fruit_id, packaging_size),
  CONSTRAINT chk_stock_size CHECK (packaging_size IN ('small', 'medium', 'large')),
  CONSTRAINT chk_stock_qty CHECK (available_quantity >= 0),
  CONSTRAINT chk_stock_price CHECK (selling_price > 0)
);

-- ============================================================================
-- Realistic Sample Data (Maseru Distribution + South African Suppliers)
-- ============================================================================

INSERT INTO suppliers (business_name, contact_person, phone, province, address) VALUES
  ('Ceres Valley Orchards', 'Pieter van der Merwe', '+27 23 312 4410', 'Western Cape', '14 Voortrekker Road, Ceres, 6835'),
  ('Letaba Subtropical Growers', 'Thabo Mokoena', '+27 15 307 8821', 'Limpopo', 'Plot 22, Tzaneen Valley Road, Limpopo, 0850'),
  ('Free State Fresh Produce Co.', 'Lerato Nhlapo', '+27 51 430 1194', 'Free State', '88 Nelson Mandela Drive, Bloemfontein, 9301'),
  ('Lowveld Citrus Estates', 'Sipho Dlamini', '+27 13 752 6045', 'Mpumalanga', 'KM 9 Nelspruit-White River Rd, Mbombela, 1200'),
  ('Joburg Fresh Market Hub', 'Nomsa Khumalo', '+27 11 613 2049', 'Gauteng', 'Hall 3, Heidelberg Road, City Deep, Johannesburg'),
  ('Sundays River Citrus Co-op', 'Andre Botha', '+27 42 230 0912', 'Eastern Cape', 'Main Road, Kirkwood, Eastern Cape, 6120');

INSERT INTO fruits (fruit_name, description, status) VALUES
  ('Apples', 'Crisp Granny Smith and Golden Delicious orchard apples packed for retail.', 'ACTIVE'),
  ('Bananas', 'Grade-A ripe yellow Cavendish bananas harvested in subtropical estates.', 'ACTIVE'),
  ('Oranges', 'Sweet Valencia and Navel juice oranges in vented distribution crates.', 'ACTIVE'),
  ('Mangoes', 'Kent and Tommy Atkins golden mangoes sorted by box grade.', 'ACTIVE'),
  ('Grapes', 'Seedless Crimson and Thompson table grapes in cold-chain cartons.', 'ACTIVE');

-- Separate stock rows for small, medium, and large packaging sizes with distinct prices
INSERT INTO stock (fruit_id, packaging_size, available_quantity, selling_price) VALUES
  (1, 'small', 42, 85.00),
  (1, 'medium', 24, 155.00),
  (1, 'large', 6, 260.00),
  (2, 'small', 55, 70.00),
  (2, 'medium', 31, 130.00),
  (2, 'large', 18, 225.00),
  (3, 'small', 48, 75.00),
  (3, 'medium', 29, 140.00),
  (3, 'large', 14, 240.00),
  (4, 'small', 19, 95.00),
  (4, 'medium', 8, 175.00),
  (4, 'large', 5, 295.00),
  (5, 'small', 26, 110.00),
  (5, 'medium', 15, 205.00),
  (5, 'large', 7, 340.00);

INSERT INTO vendors (vendor_name, phone_number, location, registration_date) VALUES
  ('Maseru Central Stall 14', '+266 5812 3401', 'Maseru Central Market', '2026-01-12'),
  ('Thibella Fresh Corner', '+266 5944 7710', 'Thibella, Maseru', '2026-02-04'),
  ('Mafeteng Junction Traders', '+266 6201 8892', 'Mafeteng Bus Stop', '2026-02-19'),
  ('Ha Tsosane Fruit Mart', '+266 5731 0944', 'Ha Tsosane, Maseru', '2026-03-08'),
  ('Roma Campus Grocers', '+266 5890 1123', 'Roma, Maseru District', '2026-04-15'),
  ('Leribe Mini Wholesale', '+266 6311 4509', 'Hlotse, Leribe', '2026-05-22');

INSERT INTO purchases (supplier_id, purchase_date, total_amount) VALUES
  (1, DATE_SUB(NOW(), INTERVAL 18 DAY), 11400.00),
  (2, DATE_SUB(NOW(), INTERVAL 12 DAY), 8950.00),
  (4, DATE_SUB(NOW(), INTERVAL 7 DAY), 7400.00),
  (5, DATE_SUB(NOW(), INTERVAL 3 DAY), 6250.00);

INSERT INTO purchase_details (purchase_id, fruit_id, quantity, unit_cost, packaging_size) VALUES
  (1, 1, 60, 55.00, 'small'),
  (1, 1, 40, 105.00, 'medium'),
  (1, 5, 20, 195.00, 'large'),
  (2, 2, 70, 45.00, 'small'),
  (2, 4, 30, 120.00, 'medium'),
  (2, 4, 11, 200.00, 'large'),
  (3, 3, 60, 50.00, 'small'),
  (3, 3, 40, 95.00, 'medium'),
  (3, 3, 4, 150.00, 'large'),
  (4, 1, 15, 170.00, 'large'),
  (4, 5, 30, 75.00, 'small'),
  (4, 2, 20, 72.50, 'medium');

INSERT INTO sales (vendor_id, sale_date, payment_method, payment_status, total_amount, amount_paid) VALUES
  (1, DATE_SUB(NOW(), INTERVAL 14 DAY), 'CASH', 'PAID', 3310.00, 3310.00),
  (2, DATE_SUB(NOW(), INTERVAL 10 DAY), 'MOBILE_MONEY', 'PARTIALLY_PAID', 2935.00, 1500.00),
  (3, DATE_SUB(NOW(), INTERVAL 6 DAY), 'CREDIT', 'UNPAID', 3515.00, 0.00),
  (4, DATE_SUB(NOW(), INTERVAL 4 DAY), 'MOBILE_MONEY', 'PAID', 2690.00, 2690.00),
  (5, DATE_SUB(NOW(), INTERVAL 2 DAY), 'CASH', 'PARTIALLY_PAID', 2375.00, 1200.00),
  (1, DATE_SUB(NOW(), INTERVAL 1 DAY), 'CASH', 'PAID', 2925.00, 2925.00);

INSERT INTO sales_details (sale_id, fruit_id, packaging_size, quantity, unit_price) VALUES
  (1, 1, 'small', 12, 85.00),
  (1, 2, 'medium', 10, 130.00),
  (1, 3, 'large', 4, 240.00),
  (2, 1, 'large', 5, 260.00),
  (2, 4, 'medium', 6, 175.00),
  (2, 5, 'small', 5, 110.00),
  (3, 2, 'large', 8, 225.00),
  (3, 3, 'medium', 7, 140.00),
  (3, 4, 'small', 7, 95.00),
  (4, 1, 'medium', 10, 155.00),
  (4, 3, 'small', 8, 75.00),
  (4, 5, 'medium', 2, 205.00),
  (5, 4, 'large', 4, 295.00),
  (5, 2, 'small', 9, 70.00),
  (5, 5, 'small', 5, 110.00),
  (6, 1, 'large', 4, 260.00),
  (6, 5, 'large', 3, 340.00),
  (6, 3, 'medium', 6, 140.00);
