export type PackagingSize = 'small' | 'medium' | 'large';
export type PaymentMethod = 'CASH' | 'MOBILE_MONEY' | 'CREDIT';
export type PaymentStatus = 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';

export const SA_PROVINCES = [
  'Gauteng',
  'Free State',
  'KwaZulu-Natal',
  'Western Cape',
  'Eastern Cape',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
] as const;

export interface Supplier {
  supplier_id: number;
  business_name: string;
  contact_person: string;
  phone: string;
  province: string;
  address: string;
  created_at: string;
  purchase_count?: number;
  total_supplied?: number;
}

export interface PackagingTier {
  stock_id: number;
  available_quantity: number;
  selling_price: number;
}

export interface FruitWithStock {
  fruit_id: number;
  fruit_name: string;
  description: string;
  status: 'ACTIVE' | 'INACTIVE';
  total_boxes: number;
  packaging: {
    small: PackagingTier;
    medium: PackagingTier;
    large: PackagingTier;
  };
}

export interface StockRow {
  stock_id: number;
  fruit_id: number;
  fruit_name: string;
  fruit_status: 'ACTIVE' | 'INACTIVE';
  packaging_size: PackagingSize;
  available_quantity: number;
  selling_price: number;
}

export interface Vendor {
  vendor_id: number;
  vendor_name: string;
  phone_number: string;
  location: string;
  registration_date: string;
  total_orders: number;
  total_purchased: number;
  total_paid: number;
  outstanding_balance: number;
}

export interface PurchaseDetail {
  purchase_detail_id: number;
  purchase_id: number;
  fruit_id: number;
  fruit_name: string;
  packaging_size: PackagingSize;
  quantity: number;
  unit_cost: number;
  line_total: number;
}

export interface Purchase {
  purchase_id: number;
  supplier_id: number;
  business_name: string;
  province: string;
  purchase_date: string;
  total_amount: number;
  total_boxes: number;
  items: PurchaseDetail[];
}

export interface SaleDetail {
  sales_detail_id: number;
  sale_id: number;
  fruit_id: number;
  fruit_name: string;
  packaging_size: PackagingSize;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface Sale {
  sale_id: number;
  vendor_id: number;
  vendor_name: string;
  vendor_phone: string;
  vendor_location: string;
  sale_date: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  total_amount: number;
  amount_paid: number;
  outstanding_balance: number;
  total_boxes: number;
  items: SaleDetail[];
}

export interface TopFruitReportRow {
  fruit_id: number;
  fruit_name: string;
  order_count: number;
  total_boxes_sold: number;
  total_revenue: number;
}

export interface RevenueSummary {
  start_date: string;
  end_date: string;
  total_orders: number;
  total_revenue: number;
  total_collected: number;
  total_outstanding: number;
  daily_breakdown: Array<{
    sale_day: string;
    orders: number;
    revenue: number;
    collected: number;
  }>;
}

export interface TopVendorRow {
  vendor_id: number;
  vendor_name: string;
  phone_number: string;
  location: string;
  total_orders: number;
  total_boxes_purchased: number;
  total_spent: number;
}

export interface StockLevelReportRow {
  stock_id: number;
  fruit_id: number;
  fruit_name: string;
  packaging_size: PackagingSize;
  available_quantity: number;
  selling_price: number;
  stock_value: number;
}

export interface VendorBalanceRow {
  vendor_id: number;
  vendor_name: string;
  phone_number: string;
  location: string;
  total_orders: number;
  total_billed: number;
  total_paid: number;
  outstanding_balance: number;
  unpaid_orders: number;
  partial_orders: number;
}
